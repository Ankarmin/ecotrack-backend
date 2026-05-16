import { randomUUID } from 'node:crypto';

import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RewardRedemptionEntity } from './reward-redemption.entity';
import { WalletEntity } from './wallet.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  wallet: WalletEntity;

  @OneToMany(() => RewardRedemptionEntity, (redemption) => redemption.user)
  redemptions: RewardRedemptionEntity[];

  @BeforeInsert()
  assignId() {
    this.id ??= randomUUID();
  }
}
