import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'ecotrack-backend',
      status: 'ok',
      endpoints: {
        auth: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me'],
        users: ['GET /users/me'],
        materials: [
          'GET /materials',
          'GET /materials/:materialId',
          'POST /materials',
        ],
        recyclingCenters: [
          'GET /recycling-centers',
          'GET /recycling-centers/:recyclingCenterId',
          'POST /recycling-centers',
        ],
        recyclingRecords: [
          'POST /recycling-records',
          'GET /recycling-records/me',
          'GET /recycling-records/:recyclingRecordId',
          'PATCH /recycling-records/:recyclingRecordId/validate',
        ],
        coupons: ['GET /coupons', 'GET /coupons/:couponId', 'POST /coupons'],
        wallet: ['GET /wallet', 'POST /wallet/redeem'],
      },
    };
  }
}
