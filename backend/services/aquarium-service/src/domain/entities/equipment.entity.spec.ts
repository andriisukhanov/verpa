import { Equipment } from './equipment.entity';
import { EquipmentType, EquipmentStatus } from '@verpa/common';

describe('Equipment Entity', () => {
  let equipment: Equipment;

  beforeEach(() => {
    equipment = new Equipment({
      name: 'Test Filter',
      type: EquipmentType.FILTER,
    });
  });

  describe('constructor', () => {
    it('should create equipment with default values', () => {
      expect(equipment.id).toBeDefined();
      expect(equipment.status).toBe(EquipmentStatus.ACTIVE);
      expect(equipment.installDate).toBeInstanceOf(Date);
      expect(equipment.createdAt).toBeInstanceOf(Date);
      expect(equipment.updatedAt).toBeInstanceOf(Date);
    });

    it('should create equipment with provided values', () => {
      const purchaseDate = new Date('2024-01-01');
      const customEquipment = new Equipment({
        id: 'custom-id',
        name: 'Custom Filter',
        type: EquipmentType.FILTER,
        brand: 'AquaBrand',
        model: 'Pro 2000',
        purchaseDate,
        status: EquipmentStatus.FAULTY,
        notes: 'Test notes',
        specifications: {
          flowRate: '2000L/h',
          power: '35W',
        },
      });

      expect(customEquipment.id).toBe('custom-id');
      expect(customEquipment.brand).toBe('AquaBrand');
      expect(customEquipment.model).toBe('Pro 2000');
      expect(customEquipment.purchaseDate).toBe(purchaseDate);
      expect(customEquipment.status).toBe(EquipmentStatus.FAULTY);
      expect(customEquipment.notes).toBe('Test notes');
      expect(customEquipment.specifications).toEqual({
        flowRate: '2000L/h',
        power: '35W',
      });
    });
  });

  describe('maintenance', () => {
    it('should detect need for maintenance', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      equipment.nextMaintenanceDate = pastDate;

      expect(equipment.needsMaintenance()).toBe(true);
    });

    it('should not need maintenance when date is in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      equipment.nextMaintenanceDate = futureDate;

      expect(equipment.needsMaintenance()).toBe(false);
    });

    it('should not need maintenance when no date set', () => {
      equipment.nextMaintenanceDate = undefined;
      expect(equipment.needsMaintenance()).toBe(false);
    });

    it('should perform maintenance and set next date for filter', () => {
      equipment.performMaintenance('Cleaned filter media');

      expect(equipment.lastMaintenanceDate).toBeInstanceOf(Date);
      expect(equipment.nextMaintenanceDate).toBeInstanceOf(Date);
      
      const daysDiff = Math.round(
        (equipment.nextMaintenanceDate!.getTime() - equipment.lastMaintenanceDate!.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30); // Filters need maintenance every 30 days
      expect(equipment.notes).toContain('Cleaned filter media');
    });

    it('should set correct maintenance intervals for different equipment types', () => {
      const testCases = [
        { type: EquipmentType.FILTER, expectedDays: 30 },
        { type: EquipmentType.HEATER, expectedDays: 180 },
        { type: EquipmentType.LIGHTING, expectedDays: 365 },
        { type: EquipmentType.PUMP, expectedDays: 90 },
        { type: EquipmentType.SKIMMER, expectedDays: 30 },
        { type: EquipmentType.CO2_SYSTEM, expectedDays: 30 },
        { type: EquipmentType.DOSING_PUMP, expectedDays: 60 },
        { type: EquipmentType.CHILLER, expectedDays: 180 },
        { type: EquipmentType.UV_STERILIZER, expectedDays: 365 },
        { type: EquipmentType.WAVEMAKER, expectedDays: 90 },
        { type: EquipmentType.AUTO_FEEDER, expectedDays: 30 },
        { type: EquipmentType.OTHER, expectedDays: 90 },
      ];

      testCases.forEach(({ type, expectedDays }) => {
        const testEquipment = new Equipment({ name: 'Test', type });
        testEquipment.performMaintenance();
        
        const daysDiff = Math.round(
          (testEquipment.nextMaintenanceDate!.getTime() - testEquipment.lastMaintenanceDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(daysDiff).toBe(expectedDays);
      });
    });
  });

  describe('status management', () => {
    it('should deactivate equipment', () => {
      equipment.deactivate();
      expect(equipment.status).toBe(EquipmentStatus.INACTIVE);
      expect(equipment.updatedAt.getTime()).toBeGreaterThan(equipment.createdAt.getTime());
    });

    it('should activate equipment', () => {
      equipment.status = EquipmentStatus.INACTIVE;
      equipment.activate();
      expect(equipment.status).toBe(EquipmentStatus.ACTIVE);
    });

    it('should mark as faulty with notes', () => {
      equipment.markAsFaulty('Not working properly');
      expect(equipment.status).toBe(EquipmentStatus.FAULTY);
      expect(equipment.notes).toContain('Fault reported');
      expect(equipment.notes).toContain('Not working properly');
    });

    it('should mark as faulty without notes', () => {
      equipment.markAsFaulty();
      expect(equipment.status).toBe(EquipmentStatus.FAULTY);
    });
  });

  describe('age and warranty', () => {
    it('should calculate age from purchase date', () => {
      const purchaseDate = new Date();
      purchaseDate.setDate(purchaseDate.getDate() - 100);
      equipment.purchaseDate = purchaseDate;

      expect(equipment.getAge()).toBe(100);
    });

    it('should calculate age from install date if no purchase date', () => {
      const installDate = new Date();
      installDate.setDate(installDate.getDate() - 50);
      equipment.installDate = installDate;
      equipment.purchaseDate = undefined;

      expect(equipment.getAge()).toBe(50);
    });

    it('should check warranty status', () => {
      const recentPurchase = new Date();
      recentPurchase.setDate(recentPurchase.getDate() - 200);
      equipment.purchaseDate = recentPurchase;

      expect(equipment.isUnderWarranty(365)).toBe(true);
      expect(equipment.isUnderWarranty(180)).toBe(false);
    });

    it('should return false for warranty if no purchase date', () => {
      equipment.purchaseDate = undefined;
      expect(equipment.isUnderWarranty()).toBe(false);
    });
  });
});