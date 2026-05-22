import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MaterialEntity } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(MaterialEntity)
    private readonly materialRepository: Repository<MaterialEntity>,
  ) {}

  async findAll() {
    const materials = await this.materialRepository.find({
      order: { isActive: 'DESC', name: 'ASC' },
    });

    return materials.map((material) => this.mapMaterial(material));
  }

  async findOne(materialId: string) {
    const material = await this.materialRepository.findOneBy({ materialId });

    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }

    return this.mapMaterial(material);
  }

  async create(createMaterialDto: CreateMaterialDto) {
    const existingMaterial = await this.materialRepository.findOneBy({
      name: createMaterialDto.name.trim(),
    });

    if (existingMaterial) {
      throw new ConflictException('Ya existe un material con ese nombre');
    }

    const material = this.materialRepository.create({
      name: createMaterialDto.name.trim(),
      co2PerKg: createMaterialDto.co2PerKg.toFixed(2),
      pointsPerKg: createMaterialDto.pointsPerKg,
      isActive: createMaterialDto.isActive ?? true,
    });

    return this.mapMaterial(await this.materialRepository.save(material));
  }

  private mapMaterial(material: MaterialEntity) {
    return {
      id: material.materialId,
      name: material.name,
      co2PerKg: Number(material.co2PerKg),
      pointsPerKg: material.pointsPerKg,
      isActive: material.isActive,
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString(),
    };
  }
}
