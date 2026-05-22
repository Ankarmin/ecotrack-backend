import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RecyclingRecordEntity } from '../../recycling-records/entities/recycling-record.entity';

@Entity('materials')
export class MaterialEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'material_id' })
  materialId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'co2_per_kg', type: 'numeric', precision: 10, scale: 2 })
  co2PerKg: string;

  @Column({ name: 'points_per_kg', type: 'int' })
  pointsPerKg: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => RecyclingRecordEntity, (record) => record.material)
  recyclingRecords: RecyclingRecordEntity[];
}
