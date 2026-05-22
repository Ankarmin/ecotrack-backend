import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      user: {
        id: user.userId,
        firstNames: user.firstNames,
        lastNames: user.lastNames,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      wallet: user.wallet
        ? {
            walletId: user.wallet.walletId,
            availablePoints: user.wallet.availablePoints,
            totalPoints: user.wallet.totalPoints,
          }
        : null,
    };
  }
}
