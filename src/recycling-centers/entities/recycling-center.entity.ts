import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RecyclingRecordEntity } from '../../recycling-records/entities/recycling-record.entity';
import { RecyclingCenterScheduleEntity } from './recycling-center-schedule.entity';

@Entity('recycling_centers')
export class RecyclingCenterEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recycling_center_id' })
  recyclingCenterId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(
    () => RecyclingCenterScheduleEntity,
    (schedule) => schedule.recyclingCenter,
  )
  schedules: RecyclingCenterScheduleEntity[];

  @OneToMany(() => RecyclingRecordEntity, (record) => record.recyclingCenter)
  recyclingRecords: RecyclingRecordEntity[];
}
