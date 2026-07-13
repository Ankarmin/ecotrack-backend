import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { createApp } from '../src/app.factory';
import { MaterialEntity } from '../src/materials/entities/material.entity';
import { RecyclingCenterEntity } from '../src/recycling-centers/entities/recycling-center.entity';

describe('Auth and recycling records (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let material: MaterialEntity;
  let recyclingCenter: RecyclingCenterEntity;

  beforeAll(async () => {
    app = await createApp();
    await app.init();

    dataSource = app.get(DataSource);

    material = await dataSource.getRepository(MaterialEntity).save({
      name: `Plastico PET ${Date.now()}`,
      co2PerKg: '1.80',
      pointsPerKg: 14,
      isActive: true,
    });

    recyclingCenter = await dataSource
      .getRepository(RecyclingCenterEntity)
      .save({
        name: `Centro Miraflores ${Date.now()}`,
        address: 'Av. Larco 100',
        district: 'Miraflores',
        isActive: true,
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it('automatiza registro, login, perfil y creación de reciclaje', async () => {
    const suffix = Date.now();
    const password = 'SuperSeguro123';
    const registerPayload = {
      firstNames: 'Carla',
      lastNames: 'Ramirez',
      email: `carla.${suffix}@example.com`,
      phone: '+51987654321',
      password,
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerPayload)
      .expect(201);

    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.user.email).toBe(registerPayload.email);
    expect(registerResponse.body.wallet).toMatchObject({
      availablePoints: 0,
      totalPoints: 0,
      balance: 0,
      redeemedCount: 0,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: registerPayload.email,
        password,
      })
      .expect(201);

    expect(loginResponse.body.user.email).toBe(registerPayload.email);

    const accessToken = loginResponse.body.accessToken as string;

    const profileResponse = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body.user).toMatchObject({
      firstNames: 'Carla',
      lastNames: 'Ramirez',
      email: registerPayload.email,
    });
    expect(profileResponse.body.wallet).toMatchObject({
      availablePoints: 0,
      totalPoints: 0,
    });

    const recordResponse = await request(app.getHttpServer())
      .post('/recycling-records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        materialId: material.materialId,
        recyclingCenterId: recyclingCenter.recyclingCenterId,
        weightKg: 2.5,
        qrCode: `ECO-E2E-${suffix}`,
      })
      .expect(201);

    expect(recordResponse.body).toMatchObject({
      materialId: material.materialId,
      recyclingCenterId: recyclingCenter.recyclingCenterId,
      status: 'Pendiente',
      weightKg: 2.5,
      savedCo2: 4.5,
      earnedPoints: 35,
      qrCode: `ECO-E2E-${suffix}`,
    });

    const recordsResponse = await request(app.getHttpServer())
      .get('/recycling-records/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(recordsResponse.body).toHaveLength(1);
    expect(recordsResponse.body[0]).toMatchObject({
      qrCode: `ECO-E2E-${suffix}`,
      status: 'Pendiente',
    });
  });
});
