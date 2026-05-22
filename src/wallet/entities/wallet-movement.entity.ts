import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { WalletMovementTypeEnum } from '../../database/database.enums';
import { WalletEntity } from './wallet.entity';

@Entity('wallet_movements')
export class WalletMovementEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'wallet_movement_id' })
  walletMovementId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => WalletEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: WalletEntity;

  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: WalletMovementTypeEnum,
    enumName: 'wallet_movement_type_enum',
  })
  movementType: WalletMovementTypeEnum;

  @Column({ type: 'int' })
  points: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
