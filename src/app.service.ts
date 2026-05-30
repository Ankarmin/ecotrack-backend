import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'ecotrack-backend',
      status: 'ok',
      endpoints: {
        auth: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me'],
        users: ['GET /users/me', 'GET /users/ranking/weekly'],
        admin: [
          'GET /admin/dashboard',
          'GET /admin/rankings/weekly/recycling-centers',
          'GET /admin/validators',
          'GET /admin/recycling-centers',
          'GET /admin/recycling-centers/:recyclingCenterId',
          'POST /admin/recycling-centers',
          'PATCH /admin/recycling-centers/:recyclingCenterId',
          'DELETE /admin/recycling-centers/:recyclingCenterId',
          'GET /admin/coupons',
          'GET /admin/coupons/:couponId',
          'POST /admin/coupons',
          'PATCH /admin/coupons/:couponId',
          'DELETE /admin/coupons/:couponId',
        ],
        materials: [
          'GET /materials',
          'GET /materials/:materialId',
          'POST /materials',
        ],
        recyclingCenters: [
          'GET /recycling-centers',
          'GET /recycling-centers/me',
          'GET /recycling-centers/me/rankings/weekly/clients',
          'GET /recycling-centers/me/recycling-records',
          'GET /recycling-centers/me/recycling-records/:recyclingRecordId',
          'PATCH /recycling-centers/me/recycling-records/:recyclingRecordId/validate',
          'POST /recycling-centers/me/recycling-records/validate-qr',
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
