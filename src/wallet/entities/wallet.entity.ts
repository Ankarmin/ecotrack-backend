import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'wallet_id' })
  walletId: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'available_points', type: 'int', default: 0 })
  availablePoints: number;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;
}
