import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserRoleEnum } from '../../database/database.enums';
import { WalletEntity } from '../../wallet/entities/wallet.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'first_names', type: 'varchar', length: 100 })
  firstNames: string;

  @Column({ name: 'last_names', type: 'varchar', length: 100 })
  lastNames: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    enumName: 'user_role_enum',
    default: UserRoleEnum.CLIENTE,
  })
  role: UserRoleEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  wallet: WalletEntity;
}
