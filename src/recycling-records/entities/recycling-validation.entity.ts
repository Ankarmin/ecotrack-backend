import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';
import { RecyclingRecordEntity } from './recycling-record.entity';

@Entity('recycling_validations')
export class RecyclingValidationEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recycling_validation_id' })
  recyclingValidationId: string;

  @Column({ name: 'recycling_record_id', type: 'uuid', unique: true })
  recyclingRecordId: string;

  @OneToOne(() => RecyclingRecordEntity, (record) => record.validation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recycling_record_id' })
  recyclingRecord: RecyclingRecordEntity;

  @Column({ name: 'validator_user_id', type: 'uuid' })
  validatorUserId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'validator_user_id' })
  validatorUser: UserEntity;

  @CreateDateColumn({ name: 'validated_at', type: 'timestamp' })
  validatedAt: Date;
}
