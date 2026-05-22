import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CouponRedemptionEntity } from '../../coupons/entities/coupon-redemption.entity';
import { RecyclingValidationEntity } from '../../recycling-records/entities/recycling-validation.entity';
import { WalletMovementEntity } from './wallet-movement.entity';

@Entity('wallet_movement_details')
export class WalletMovementDetailEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'wallet_movement_detail_id' })
  walletMovementDetailId: string;

  @Column({ name: 'wallet_movement_id', type: 'uuid', unique: true })
  walletMovementId: string;

  @OneToOne(() => WalletMovementEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_movement_id' })
  walletMovement: WalletMovementEntity;

  @Column({ name: 'recycling_validation_id', type: 'uuid', nullable: true })
  recyclingValidationId: string | null;

  @OneToOne(() => RecyclingValidationEntity)
  @JoinColumn({ name: 'recycling_validation_id' })
  recyclingValidation: RecyclingValidationEntity | null;

  @Column({ name: 'coupon_redemption_id', type: 'uuid', nullable: true })
  couponRedemptionId: string | null;

  @OneToOne(() => CouponRedemptionEntity)
  @JoinColumn({ name: 'coupon_redemption_id' })
  couponRedemption: CouponRedemptionEntity | null;
}
