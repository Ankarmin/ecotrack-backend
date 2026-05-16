import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { RewardRedemptionEntity } from '../database/entities/reward-redemption.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './auth.types';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RewardRedemptionEntity)
    private readonly redemptionRepository: Repository<RewardRedemptionEntity>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = this.normalizeEmail(registerDto.email);
    const name = registerDto.name.trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: { id: true },
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
          name,
          email,
          passwordHash,
        });

        await manager.save(user);

        const wallet = manager.create(WalletEntity, {
          userId: user.id,
        });

        await manager.save(wallet);

        return user;
      });

      return this.buildAuthResponse(createdUser.id);
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
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña inválidos');
    }

    const redeemedCount = await this.redemptionRepository.count({
      where: { userId: user.id },
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
      where: { id: userId },
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
      sub: user.id,
      email: user.email,
    } satisfies AccessTokenPayload);

    return {
      accessToken,
      user: this.mapUser(user),
      wallet: this.mapWallet(this.getWallet(user), redeemedCount),
    };
  }

  private mapUser(user: UserEntity) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private mapWallet(wallet: WalletEntity, redeemedCount: number) {
    return {
      balance: wallet.balance,
      earnedToday: wallet.earnedToday,
      weeklyChange: wallet.weeklyChange,
      redeemedCount,
      level: wallet.level,
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
