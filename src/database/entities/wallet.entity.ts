import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from './user.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'int', default: 1240 })
  balance: number;

  @Column({ name: 'earned_today', type: 'int', default: 45 })
  earnedToday: number;

  @Column({ name: 'weekly_change', type: 'int', default: 180 })
  weeklyChange: number;

  @Column({ type: 'varchar', length: 50, default: 'Oro' })
  level: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
