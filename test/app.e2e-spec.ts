import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        service: 'ecotrack-backend',
        status: 'ok',
        endpoints: {
          auth: [
            'POST /auth/register',
            'POST /auth/login',
            'GET /auth/me',
          ],
          wallet: ['GET /wallet', 'POST /wallet/redeem'],
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
