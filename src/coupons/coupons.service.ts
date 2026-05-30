import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CouponEntity } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
  ) {}

  async findAll() {
    const coupons = await this.couponRepository.find({
      order: { isActive: 'DESC', requiredPoints: 'ASC', title: 'ASC' },
    });

    return coupons.map((coupon) => this.mapCoupon(coupon));
  }

  async findOne(couponId: string) {
    const coupon = await this.couponRepository.findOneBy({ couponId });

    if (!coupon) {
      throw new NotFoundException('Cupon no encontrado');
    }

    return this.mapCoupon(coupon);
  }

  async create(createCouponDto: CreateCouponDto) {
    const coupon = this.couponRepository.create({
      title: createCouponDto.title.trim(),
      description: createCouponDto.description?.trim() ?? null,
      requiredPoints: createCouponDto.requiredPoints,
      stock: createCouponDto.stock,
      validityDays: createCouponDto.validityDays ?? 30,
      isActive: createCouponDto.isActive ?? true,
    });

    return this.mapCoupon(await this.couponRepository.save(coupon));
  }

  private mapCoupon(coupon: CouponEntity) {
    return {
      id: coupon.couponId,
      title: coupon.title,
      description: coupon.description,
      requiredPoints: coupon.requiredPoints,
      stock: coupon.stock,
      validityDays: coupon.validityDays,
      isActive: coupon.isActive && !this.isCouponExpired(coupon),
      status: this.getCouponStatus(coupon),
      expiresAt: this.calculateCouponExpiresAt(coupon).toISOString(),
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  private isCouponExpired(coupon: CouponEntity) {
    return this.calculateCouponExpiresAt(coupon) < new Date();
  }

  private getCouponStatus(coupon: CouponEntity) {
    if (!coupon.isActive) {
      return 'Inactivo';
    }

    if (this.isCouponExpired(coupon)) {
      return 'Expirado';
    }

    if (coupon.stock <= 0) {
      return 'Usado';
    }

    return 'Activo';
  }

  private calculateCouponExpiresAt(coupon: CouponEntity) {
    const expiresAt = new Date(coupon.createdAt);
    expiresAt.setDate(expiresAt.getDate() + coupon.validityDays);
    return expiresAt;
  }
}
