import { Inhabitant } from './inhabitant.entity';
import { InhabitantType } from '@verpa/common';

describe('Inhabitant Entity', () => {
  let inhabitant: Inhabitant;

  beforeEach(() => {
    inhabitant = new Inhabitant({
      name: 'Neon Tetra',
      type: InhabitantType.FISH,
      species: 'Paracheirodon innesi',
      quantity: 10,
      size: 'small',
      temperatureMin: 20,
      temperatureMax: 28,
      phMin: 6.0,
      phMax: 7.5,
      careLevel: 'easy',
    });
  });

  describe('constructor', () => {
    it('should create inhabitant with default values', () => {
      const basic = new Inhabitant({
        name: 'Test Fish',
        type: InhabitantType.FISH,
        species: 'Test species',
        size: 'medium',
        temperatureMin: 22,
        temperatureMax: 26,
        phMin: 6.5,
        phMax: 7.5,
        careLevel: 'moderate',
      });

      expect(basic.id).toBeDefined();
      expect(basic.quantity).toBe(1);
      expect(basic.addedDate).toBeInstanceOf(Date);
      expect(basic.createdAt).toBeInstanceOf(Date);
      expect(basic.updatedAt).toBeInstanceOf(Date);
    });

    it('should create inhabitant with provided values', () => {
      const customInhabitant = new Inhabitant({
        id: 'custom-id',
        name: 'Custom Fish',
        type: InhabitantType.FISH,
        species: 'Custom species',
        scientificName: 'Customus fishius',
        quantity: 5,
        size: 'large',
        temperatureMin: 24,
        temperatureMax: 30,
        phMin: 7.0,
        phMax: 8.0,
        careLevel: 'difficult',
        diet: 'Carnivore',
        compatibility: ['species1', 'species2'],
        notes: 'Test notes',
        imageUrl: 'https://example.com/fish.jpg',
      });

      expect(customInhabitant.id).toBe('custom-id');
      expect(customInhabitant.scientificName).toBe('Customus fishius');
      expect(customInhabitant.quantity).toBe(5);
      expect(customInhabitant.diet).toBe('Carnivore');
      expect(customInhabitant.compatibility).toEqual(['species1', 'species2']);
      expect(customInhabitant.notes).toBe('Test notes');
      expect(customInhabitant.imageUrl).toBe('https://example.com/fish.jpg');
    });
  });

  describe('compatibility checks', () => {
    it('should check temperature compatibility', () => {
      expect(inhabitant.isCompatibleWithTemperature(25)).toBe(true);
      expect(inhabitant.isCompatibleWithTemperature(20)).toBe(true);
      expect(inhabitant.isCompatibleWithTemperature(28)).toBe(true);
      expect(inhabitant.isCompatibleWithTemperature(19)).toBe(false);
      expect(inhabitant.isCompatibleWithTemperature(29)).toBe(false);
    });

    it('should check pH compatibility', () => {
      expect(inhabitant.isCompatibleWithPh(7.0)).toBe(true);
      expect(inhabitant.isCompatibleWithPh(6.0)).toBe(true);
      expect(inhabitant.isCompatibleWithPh(7.5)).toBe(true);
      expect(inhabitant.isCompatibleWithPh(5.9)).toBe(false);
      expect(inhabitant.isCompatibleWithPh(7.6)).toBe(false);
    });

    it('should check species compatibility', () => {
      inhabitant.compatibility = ['Corydoras', 'Rasbora', 'Otocinclus'];
      
      expect(inhabitant.isCompatibleWithSpecies('Corydoras')).toBe(true);
      expect(inhabitant.isCompatibleWithSpecies('Rasbora')).toBe(true);
      expect(inhabitant.isCompatibleWithSpecies('Cichlid')).toBe(false);
    });

    it('should return true for unknown compatibility', () => {
      inhabitant.compatibility = undefined;
      expect(inhabitant.isCompatibleWithSpecies('AnySpecies')).toBe(true);
      
      inhabitant.compatibility = [];
      expect(inhabitant.isCompatibleWithSpecies('AnySpecies')).toBe(true);
    });
  });

  describe('quantity management', () => {
    it('should update quantity', () => {
      inhabitant.updateQuantity(20);
      expect(inhabitant.quantity).toBe(20);
      expect(inhabitant.updatedAt.getTime()).toBeGreaterThan(inhabitant.createdAt.getTime());
    });

    it('should throw error for negative quantity', () => {
      expect(() => inhabitant.updateQuantity(-1)).toThrow('Quantity cannot be negative');
    });

    it('should add individuals', () => {
      inhabitant.addIndividuals(5);
      expect(inhabitant.quantity).toBe(15);
    });

    it('should throw error when adding zero or negative individuals', () => {
      expect(() => inhabitant.addIndividuals(0)).toThrow('Count must be positive');
      expect(() => inhabitant.addIndividuals(-1)).toThrow('Count must be positive');
    });

    it('should remove individuals', () => {
      inhabitant.removeIndividuals(3);
      expect(inhabitant.quantity).toBe(7);
    });

    it('should throw error when removing zero or negative individuals', () => {
      expect(() => inhabitant.removeIndividuals(0)).toThrow('Count must be positive');
      expect(() => inhabitant.removeIndividuals(-1)).toThrow('Count must be positive');
    });

    it('should throw error when removing more than exists', () => {
      expect(() => inhabitant.removeIndividuals(15)).toThrow('Cannot remove more individuals than exist');
    });
  });

  describe('age calculation', () => {
    it('should calculate age in days', () => {
      const addedDate = new Date();
      addedDate.setDate(addedDate.getDate() - 30);
      inhabitant.addedDate = addedDate;

      expect(inhabitant.getAgeInDays()).toBe(30);
    });

    it('should return 0 for today', () => {
      inhabitant.addedDate = new Date();
      expect(inhabitant.getAgeInDays()).toBe(0);
    });
  });

  describe('bioload calculation', () => {
    it('should calculate bioload for small inhabitants', () => {
      const small = new Inhabitant({
        name: 'Small Fish',
        type: InhabitantType.FISH,
        species: 'Small species',
        quantity: 10,
        size: 'small',
        temperatureMin: 20,
        temperatureMax: 28,
        phMin: 6.0,
        phMax: 7.5,
        careLevel: 'easy',
      });

      expect(small.getBioload()).toBe(10); // 10 * 1
    });

    it('should calculate bioload for medium inhabitants', () => {
      const medium = new Inhabitant({
        name: 'Medium Fish',
        type: InhabitantType.FISH,
        species: 'Medium species',
        quantity: 5,
        size: 'medium',
        temperatureMin: 22,
        temperatureMax: 26,
        phMin: 6.5,
        phMax: 7.5,
        careLevel: 'moderate',
      });

      expect(medium.getBioload()).toBe(15); // 5 * 3
    });

    it('should calculate bioload for large inhabitants', () => {
      const large = new Inhabitant({
        name: 'Large Fish',
        type: InhabitantType.FISH,
        species: 'Large species',
        quantity: 2,
        size: 'large',
        temperatureMin: 24,
        temperatureMax: 28,
        phMin: 7.0,
        phMax: 8.0,
        careLevel: 'difficult',
      });

      expect(large.getBioload()).toBe(10); // 2 * 5
    });
  });

  describe('care level', () => {
    it('should return correct care level score', () => {
      const easy = new Inhabitant({ ...inhabitant, careLevel: 'easy' });
      const moderate = new Inhabitant({ ...inhabitant, careLevel: 'moderate' });
      const difficult = new Inhabitant({ ...inhabitant, careLevel: 'difficult' });

      expect(easy.getCareLevelScore()).toBe(1);
      expect(moderate.getCareLevelScore()).toBe(2);
      expect(difficult.getCareLevelScore()).toBe(3);
    });
  });

  describe('toJSON', () => {
    it('should include calculated fields in JSON', () => {
      const addedDate = new Date();
      addedDate.setDate(addedDate.getDate() - 15);
      inhabitant.addedDate = addedDate;

      const json = inhabitant.toJSON();
      
      expect(json).toHaveProperty('ageInDays', 15);
      expect(json).toHaveProperty('bioload', 10); // 10 small fish
      expect(json).toHaveProperty('name', 'Neon Tetra');
      expect(json).toHaveProperty('quantity', 10);
    });
  });
});