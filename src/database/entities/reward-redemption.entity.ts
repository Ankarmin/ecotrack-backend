import { randomUUID } from 'node:crypto';

import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { RewardEntity } from './reward.entity';
import { UserEntity } from './user.entity';

@Index(['userId', 'createdAt'])
@Entity('reward_redemptions')
export class RewardRedemptionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.redemptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'reward_id', type: 'varchar', length: 50 })
  rewardId: string;

  @ManyToOne(() => RewardEntity, (reward) => reward.redemptions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reward_id' })
  reward: RewardEntity;

  @Column({ name: 'reward_title', type: 'varchar', length: 255 })
  rewardTitle: string;

  @Column({ type: 'int' })
  cost: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    this.id ??= randomUUID();
  }
}
