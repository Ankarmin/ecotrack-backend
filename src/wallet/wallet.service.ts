import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { randomUUID } from 'node:crypto';

import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import {
  CouponRedemptionStatusEnum,
  WalletMovementTypeEnum,
} from '../database/database.enums';
import { WalletMovementDetailEntity } from './entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from './entities/wallet-movement.entity';
import { WalletEntity } from './entities/wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
    @InjectRepository(CouponRedemptionEntity)
    private readonly redemptionRepository: Repository<CouponRedemptionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.findWalletByUserId(userId);

    const [coupons, recentRedemptions, redeemedCount] = await Promise.all([
      this.couponRepository.find({
        order: {
          isActive: 'DESC',
          requiredPoints: 'ASC',
          title: 'ASC',
        },
      }),
      this.redemptionRepository.find({
        where: { userId },
        relations: { coupon: true },
        order: { redeemedAt: 'DESC' },
        take: 10,
      }),
      this.redemptionRepository.count({ where: { userId } }),
    ]);

    return {
      wallet: this.mapWallet(wallet, redeemedCount),
      coupons: coupons.map((coupon) => this.mapCoupon(coupon)),
      recentRedemptions: recentRedemptions.map((redemption) =>
        this.mapRedemption(redemption),
      ),
    };
  }

  async redeemCoupon(userId: string, couponId: string) {
    return this.dataSource.transaction(async (manager) => {
      const couponRepository = manager.getRepository(CouponEntity);
      const walletRepository = manager.getRepository(WalletEntity);
      const redemptionRepository = manager.getRepository(
        CouponRedemptionEntity,
      );
      const walletMovementRepository =
        manager.getRepository(WalletMovementEntity);
      const walletMovementDetailRepository = manager.getRepository(
        WalletMovementDetailEntity,
      );

      const coupon = await couponRepository.findOne({
        where: { couponId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coupon) {
        throw new NotFoundException('Cupon no encontrado');
      }

      if (!coupon.isActive) {
        throw new ConflictException('El cupon no esta disponible');
      }

      if (coupon.stock <= 0) {
        throw new ConflictException('El cupon no tiene stock disponible');
      }

      const wallet = await walletRepository.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (wallet.availablePoints < coupon.requiredPoints) {
        throw new ConflictException(
          'No tienes EcoPuntos suficientes para este canje',
        );
      }

      wallet.availablePoints -= coupon.requiredPoints;
      const updatedWallet = await walletRepository.save(wallet);
      coupon.stock -= 1;
      await couponRepository.save(coupon);

      const redemption = redemptionRepository.create({
        userId,
        couponId: coupon.couponId,
        usedPoints: coupon.requiredPoints,
        redemptionCode: randomUUID(),
        status: CouponRedemptionStatusEnum.CANJEADO,
        expiresAt: this.calculateExpirationDate(coupon.validityDays),
      });

      const savedRedemption = await redemptionRepository.save(redemption);

      const movement = walletMovementRepository.create({
        walletId: wallet.walletId,
        movementType: WalletMovementTypeEnum.CANJE,
        points: -coupon.requiredPoints,
      });

      const savedMovement = await walletMovementRepository.save(movement);

      const movementDetail = walletMovementDetailRepository.create({
        walletMovementId: savedMovement.walletMovementId,
        couponRedemptionId: savedRedemption.couponRedemptionId,
      });

      await walletMovementDetailRepository.save(movementDetail);
      const redeemedCount = await redemptionRepository.count({
        where: { userId },
      });

      return {
        message: 'Canje realizado correctamente',
        wallet: this.mapWallet(updatedWallet, redeemedCount),
        redemption: this.mapRedemption(savedRedemption, coupon),
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
      walletId: wallet.walletId,
      availablePoints: wallet.availablePoints,
      totalPoints: wallet.totalPoints,
      balance: wallet.availablePoints,
      redeemedCount,
    };
  }

  private mapCoupon(coupon: CouponEntity) {
    return {
      id: coupon.couponId,
      title: coupon.title,
      description: coupon.description,
      requiredPoints: coupon.requiredPoints,
      stock: coupon.stock,
      validityDays: coupon.validityDays,
      isActive: coupon.isActive,
    };
  }

  private mapRedemption(
    redemption: CouponRedemptionEntity,
    coupon?: CouponEntity,
  ) {
    const couponDetails = coupon ?? redemption.coupon;

    if (!couponDetails) {
      throw new NotFoundException('Cupon asociado no encontrado');
    }

    return {
      id: redemption.couponRedemptionId,
      couponId: redemption.couponId,
      title: couponDetails.title,
      description: couponDetails.description,
      usedPoints: redemption.usedPoints,
      redemptionCode: redemption.redemptionCode,
      status: redemption.status,
      redeemedAt: redemption.redeemedAt.toISOString(),
      expiresAt: redemption.expiresAt.toISOString(),
    };
  }

  private calculateExpirationDate(validityDays: number) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    return expiresAt;
  }
}
