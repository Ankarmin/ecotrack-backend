import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RewardRedemptionEntity } from './reward-redemption.entity';

@Entity('rewards')
export class RewardEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int' })
  cost: number;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 80 })
  icon: string;

  @Column({ type: 'varchar', length: 80 })
  color: string;

  @Column({ type: 'boolean', default: true })
  available: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RewardRedemptionEntity, (redemption) => redemption.reward)
  redemptions: RewardRedemptionEntity[];
}
