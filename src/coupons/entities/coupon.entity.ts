import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'coupon_id' })
  couponId: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'required_points', type: 'int' })
  requiredPoints: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'validity_days', type: 'int', default: 30 })
  validityDays: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
