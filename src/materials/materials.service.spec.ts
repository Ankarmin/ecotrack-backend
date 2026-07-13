import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service';
import { MaterialEntity } from './entities/material.entity';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let materialRepository: any;

  function createMockMaterial(overrides?: Partial<MaterialEntity>): MaterialEntity {
    return {
      materialId: 'mat-1',
      name: 'Plastico',
      co2PerKg: '2.50',
      pointsPerKg: 10,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      recyclingRecords: [],
      ...overrides,
    };
  }

  beforeEach(async () => {
    materialRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: getRepositoryToken(MaterialEntity), useValue: materialRepository },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('findAll', () => {
    it('devuelve todos los materiales mapeados', async () => {
      const materials = [
        createMockMaterial({ materialId: 'mat-1', name: 'Plastico' }),
        createMockMaterial({ materialId: 'mat-2', name: 'Vidrio' }),
      ];
      materialRepository.find.mockResolvedValue(materials);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0].name).toBe('Plastico');
      expect(result[0].co2PerKg).toBe(2.5);
    });

    it('devuelve array vacio si no hay materiales', async () => {
      materialRepository.find.mockResolvedValue([]);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('devuelve un material por id', async () => {
      materialRepository.findOneBy.mockResolvedValue(createMockMaterial());

      const result = await service.findOne('mat-1');

      expect(result.name).toBe('Plastico');
      expect(result.pointsPerKg).toBe(10);
    });

    it('lanza NotFoundException si no existe', async () => {
      materialRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('mat-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('crea un nuevo material', async () => {
      materialRepository.findOneBy.mockResolvedValue(null);
      const saved = createMockMaterial({ materialId: 'mat-new', name: 'Aluminio', co2PerKg: '5.00', pointsPerKg: 15 });
      materialRepository.create.mockReturnValue(saved);
      materialRepository.save.mockResolvedValue(saved);

      const result = await service.create({
        name: ' Aluminio ',
        co2PerKg: 5.0,
        pointsPerKg: 15,
        isActive: true,
      });

      expect(result.name).toBe('Aluminio');
      expect(result.co2PerKg).toBe(5.0);
      expect(result.pointsPerKg).toBe(15);
    });

    it('lanza ConflictException si ya existe un material con ese nombre', async () => {
      materialRepository.findOneBy.mockResolvedValue(createMockMaterial());

      await expect(
        service.create({ name: 'Plastico', co2PerKg: 2.5, pointsPerKg: 10 }),
      ).rejects.toThrow(ConflictException);
    });

    it('aplica isActive=true por defecto', async () => {
      materialRepository.findOneBy.mockResolvedValue(null);
      const saved = createMockMaterial();
      materialRepository.create.mockReturnValue(saved);
      materialRepository.save.mockResolvedValue(saved);

      await service.create({ name: 'Carton', co2PerKg: 1.5, pointsPerKg: 5 } as any);

      expect(materialRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });
});
