import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('devuelve estado ok con todos los endpoints listados', () => {
    const status = service.getStatus();

    expect(status.service).toBe('ecotrack-backend');
    expect(status.status).toBe('ok');
    expect(status.endpoints).toHaveProperty('auth');
    expect(status.endpoints).toHaveProperty('users');
    expect(status.endpoints).toHaveProperty('admin');
    expect(status.endpoints).toHaveProperty('materials');
    expect(status.endpoints).toHaveProperty('recyclingCenters');
    expect(status.endpoints).toHaveProperty('recyclingRecords');
    expect(status.endpoints).toHaveProperty('coupons');
    expect(status.endpoints).toHaveProperty('wallet');
  });
});
