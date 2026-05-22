import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { WeekdayEnum } from '../../database/database.enums';
import { RecyclingCenterEntity } from './recycling-center.entity';

@Unique('uq_recycling_center_weekday', ['recyclingCenterId', 'weekday'])
@Entity('recycling_center_schedules')
export class RecyclingCenterScheduleEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'schedule_id' })
  scheduleId: string;

  @Column({ name: 'recycling_center_id', type: 'uuid' })
  recyclingCenterId: string;

  @ManyToOne(() => RecyclingCenterEntity, (center) => center.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recycling_center_id' })
  recyclingCenter: RecyclingCenterEntity;

  @Column({
    type: 'enum',
    enum: WeekdayEnum,
    enumName: 'weekday_enum',
  })
  weekday: WeekdayEnum;

  @Column({ type: 'boolean', default: true })
  attends: boolean;

  @Column({ name: 'opening_time', type: 'time', nullable: true })
  openingTime: string | null;

  @Column({ name: 'closing_time', type: 'time', nullable: true })
  closingTime: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
