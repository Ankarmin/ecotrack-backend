import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './auth.types';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CouponRedemptionEntity)
    private readonly redemptionRepository: Repository<CouponRedemptionEntity>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = this.normalizeEmail(registerDto.email);
    const firstNames = registerDto.firstNames.trim();
    const lastNames = registerDto.lastNames.trim();
    const phone = registerDto.phone.trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: { userId: true },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    try {
      const passwordHash = await this.passwordService.hashPassword(
        registerDto.password,
      );

      const createdUser = await this.dataSource.transaction(async (manager) => {
        const user = manager.create(UserEntity, {
          firstNames,
          lastNames,
          email,
          phone,
          password: passwordHash,
        });

        await manager.save(user);

        const wallet = manager.create(WalletEntity, {
          userId: user.userId,
        });

        await manager.save(wallet);

        return user;
      });

      return this.buildAuthResponse(createdUser.userId);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const email = this.normalizeEmail(loginDto.email);
    const user = await this.userRepository.findOne({
      where: { email },
      relations: { wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contraseña inválidos');
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña inválidos');
    }

    const redeemedCount = await this.redemptionRepository.count({
      where: { userId: user.userId },
    });

    return this.buildAuthResponseFromUser(user, redeemedCount);
  }

  async getProfile(userId: string) {
    const user = await this.findUserById(userId);
    const redeemedCount = await this.redemptionRepository.count({
      where: { userId },
    });

    return {
      user: this.mapUser(user),
      wallet: this.mapWallet(this.getWallet(user), redeemedCount),
    };
  }

  private async findUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  private async buildAuthResponse(userId: string) {
    const user = await this.findUserById(userId);
    const redeemedCount = await this.redemptionRepository.count({
      where: { userId },
    });

    return this.buildAuthResponseFromUser(user, redeemedCount);
  }

  private async buildAuthResponseFromUser(
    user: UserEntity,
    redeemedCount: number,
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.userId,
      email: user.email,
      role: user.role,
    } satisfies AccessTokenPayload);

    return {
      accessToken,
      user: this.mapUser(user),
      wallet: this.mapWallet(this.getWallet(user), redeemedCount),
    };
  }

  private mapUser(user: UserEntity) {
    return {
      id: user.userId,
      firstNames: user.firstNames,
      lastNames: user.lastNames,
      name: `${user.firstNames} ${user.lastNames}`.trim(),
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private mapWallet(wallet: WalletEntity, redeemedCount: number) {
    return {
      walletId: wallet.walletId,
      availablePoints: wallet.availablePoints,
      totalPoints: wallet.totalPoints,
      balance: wallet.availablePoints,
      redeemedCount,
    };
  }

  private getWallet(user: UserEntity) {
    if (!user.wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    return user.wallet;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isUniqueViolation(error: unknown) {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505',
    );
  }
}
