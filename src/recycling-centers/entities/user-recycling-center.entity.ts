import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';
import { RecyclingCenterEntity } from './recycling-center.entity';

@Unique('uq_user_recycling_center', ['userId', 'recyclingCenterId'])
@Entity('user_recycling_centers')
export class UserRecyclingCenterEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_recycling_center_id' })
  userRecyclingCenterId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'recycling_center_id', type: 'uuid' })
  recyclingCenterId: string;

  @ManyToOne(() => RecyclingCenterEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recycling_center_id' })
  recyclingCenter: RecyclingCenterEntity;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;
}
