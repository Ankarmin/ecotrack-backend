import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { RewardRedemptionEntity } from '../database/entities/reward-redemption.entity';
import { RewardEntity } from '../database/entities/reward.entity';
import { WalletEntity } from '../database/entities/wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(RewardEntity)
    private readonly rewardRepository: Repository<RewardEntity>,
    @InjectRepository(RewardRedemptionEntity)
    private readonly redemptionRepository: Repository<RewardRedemptionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.findWalletByUserId(userId);

    const [rewards, recentRedemptions, redeemedCount] = await Promise.all([
      this.rewardRepository.find(),
      this.redemptionRepository.find({
        where: { userId },
        relations: { reward: true },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.redemptionRepository.count({ where: { userId } }),
    ]);

    rewards.sort(
      (left, right) =>
        Number(right.available) - Number(left.available) ||
        left.cost - right.cost ||
        left.id.localeCompare(right.id),
    );

    return {
      wallet: this.mapWallet(wallet, redeemedCount),
      rewards: rewards.map((reward) => this.mapReward(reward)),
      recentRedemptions: recentRedemptions.map((redemption) =>
        this.mapRedemption(redemption),
      ),
    };
  }

  async redeemReward(userId: string, rewardId: string) {
    return this.dataSource.transaction(async (manager) => {
      const rewardRepository = manager.getRepository(RewardEntity);
      const walletRepository = manager.getRepository(WalletEntity);
      const redemptionRepository = manager.getRepository(RewardRedemptionEntity);

      const reward = await rewardRepository.findOneBy({ id: rewardId });

      if (!reward) {
        throw new NotFoundException('Recompensa no encontrada');
      }

      if (!reward.available) {
        throw new ConflictException('La recompensa no está disponible');
      }

      const wallet = await walletRepository.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (wallet.balance < reward.cost) {
        throw new ConflictException('No tienes EcoPuntos suficientes para este canje');
      }

      wallet.balance -= reward.cost;
      const updatedWallet = await walletRepository.save(wallet);

      const redemption = redemptionRepository.create({
        userId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        cost: reward.cost,
      });

      const savedRedemption = await redemptionRepository.save(redemption);
      const redeemedCount = await redemptionRepository.count({ where: { userId } });

      return {
        message: 'Canje realizado correctamente',
        wallet: this.mapWallet(updatedWallet, redeemedCount),
        redemption: this.mapRedemption(savedRedemption, reward),
      };
    });
  }

  private async findWalletByUserId(userId: string) {
    const wallet = await this.walletRepository.findOneBy({ userId });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    return wallet;
  }

  private mapWallet(wallet: WalletEntity, redeemedCount: number) {
    return {
      balance: wallet.balance,
      earnedToday: wallet.earnedToday,
      weeklyChange: wallet.weeklyChange,
      redeemedCount,
      level: wallet.level,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  private mapReward(reward: RewardEntity) {
    return {
      id: reward.id,
      title: reward.title,
      cost: reward.cost,
      category: reward.category,
      icon: reward.icon,
      color: reward.color,
      available: reward.available,
    };
  }

  private mapRedemption(
    redemption: RewardRedemptionEntity,
    reward?: RewardEntity,
  ) {
    const rewardDetails = reward ?? redemption.reward;

    if (!rewardDetails) {
      throw new NotFoundException('Recompensa asociada no encontrada');
    }

    return {
      id: redemption.id,
      rewardId: redemption.rewardId,
      title: redemption.rewardTitle,
      cost: redemption.cost,
      category: rewardDetails.category,
      icon: rewardDetails.icon,
      color: rewardDetails.color,
      createdAt: redemption.createdAt.toISOString(),
    };
  }
}
