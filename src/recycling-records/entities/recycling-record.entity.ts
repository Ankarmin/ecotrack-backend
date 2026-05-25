import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RecyclingRecordStatusEnum } from '../../database/database.enums';
import { MaterialEntity } from '../../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../../recycling-centers/entities/recycling-center.entity';
import { RecyclingValidationEntity } from './recycling-validation.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('recycling_records')
export class RecyclingRecordEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recycling_record_id' })
  recyclingRecordId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId: string;

  @ManyToOne(() => MaterialEntity, (material) => material.recyclingRecords)
  @JoinColumn({ name: 'material_id' })
  material: MaterialEntity;

  @Column({ name: 'recycling_center_id', type: 'uuid' })
  recyclingCenterId: string;

  @ManyToOne(() => RecyclingCenterEntity, (center) => center.recyclingRecords)
  @JoinColumn({ name: 'recycling_center_id' })
  recyclingCenter: RecyclingCenterEntity;

  @Column({ name: 'weight_kg', type: 'numeric', precision: 10, scale: 2 })
  weightKg: string;

  @Column({ name: 'saved_co2', type: 'numeric', precision: 10, scale: 2 })
  savedCo2: string;

  @Column({ name: 'earned_points', type: 'int' })
  earnedPoints: number;

  @Column({ name: 'qr_code', type: 'varchar', length: 100, unique: true })
  qrCode: string;

  @Column({
    type: 'enum',
    enum: RecyclingRecordStatusEnum,
    enumName: 'recycling_record_status_enum',
    default: RecyclingRecordStatusEnum.PENDIENTE,
  })
  status: RecyclingRecordStatusEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToOne(
    () => RecyclingValidationEntity,
    (validation) => validation.recyclingRecord,
  )
  validation: RecyclingValidationEntity;
}
