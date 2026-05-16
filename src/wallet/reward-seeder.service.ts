import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RewardEntity } from '../database/entities/reward.entity';
import { rewardCatalog } from './reward-catalog';

@Injectable()
export class RewardSeederService implements OnModuleInit {
  constructor(
    @InjectRepository(RewardEntity)
    private readonly rewardRepository: Repository<RewardEntity>,
  ) {}

  async onModuleInit() {
    await this.rewardRepository.upsert([...rewardCatalog], ['id']);
  }
}
