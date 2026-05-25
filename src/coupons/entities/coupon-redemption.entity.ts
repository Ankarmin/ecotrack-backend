import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CouponRedemptionStatusEnum } from '../../database/database.enums';
import { CouponEntity } from './coupon.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('coupon_redemptions')
export class CouponRedemptionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'coupon_redemption_id' })
  couponRedemptionId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId: string;

  @ManyToOne(() => CouponEntity)
  @JoinColumn({ name: 'coupon_id' })
  coupon: CouponEntity;

  @Column({ name: 'used_points', type: 'int' })
  usedPoints: number;

  @Column({
    name: 'redemption_code',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  redemptionCode: string;

  @Column({
    type: 'enum',
    enum: CouponRedemptionStatusEnum,
    enumName: 'coupon_redemption_status_enum',
    default: CouponRedemptionStatusEnum.CANJEADO,
  })
  status: CouponRedemptionStatusEnum;

  @CreateDateColumn({ name: 'redeemed_at', type: 'timestamp' })
  redeemedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'status_updated_at', type: 'timestamp' })
  statusUpdatedAt: Date;
}
