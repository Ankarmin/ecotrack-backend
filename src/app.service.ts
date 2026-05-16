import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'ecotrack-backend',
      status: 'ok',
      endpoints: {
        auth: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me'],
        wallet: ['GET /wallet', 'POST /wallet/redeem'],
      },
    };
  }
}
