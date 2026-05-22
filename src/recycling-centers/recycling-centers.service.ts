import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecyclingCenterEntity } from './entities/recycling-center.entity';
import { CreateRecyclingCenterDto } from './dto/create-recycling-center.dto';

@Injectable()
export class RecyclingCentersService {
  constructor(
    @InjectRepository(RecyclingCenterEntity)
    private readonly recyclingCenterRepository: Repository<RecyclingCenterEntity>,
  ) {}

  async findAll() {
    const centers = await this.recyclingCenterRepository.find({
      relations: { schedules: true },
      order: { isActive: 'DESC', name: 'ASC', schedules: { weekday: 'ASC' } },
    });

    return centers.map((center) => this.mapCenter(center));
  }

  async findOne(recyclingCenterId: string) {
    const center = await this.recyclingCenterRepository.findOne({
      where: { recyclingCenterId },
      relations: { schedules: true },
    });

    if (!center) {
      throw new NotFoundException('Centro de reciclaje no encontrado');
    }

    return this.mapCenter(center);
  }

  async create(createRecyclingCenterDto: CreateRecyclingCenterDto) {
    const center = this.recyclingCenterRepository.create({
      name: createRecyclingCenterDto.name.trim(),
      address: createRecyclingCenterDto.address.trim(),
      district: createRecyclingCenterDto.district?.trim() ?? null,
    });

    return this.mapCenter(await this.recyclingCenterRepository.save(center));
  }

  private mapCenter(center: RecyclingCenterEntity) {
    return {
      id: center.recyclingCenterId,
      name: center.name,
      address: center.address,
      district: center.district,
      isActive: center.isActive,
      schedules:
        center.schedules?.map((schedule) => ({
          id: schedule.scheduleId,
          weekday: schedule.weekday,
          attends: schedule.attends,
          openingTime: schedule.openingTime,
          closingTime: schedule.closingTime,
        })) ?? [],
      createdAt: center.createdAt.toISOString(),
      updatedAt: center.updatedAt.toISOString(),
    };
  }
}
