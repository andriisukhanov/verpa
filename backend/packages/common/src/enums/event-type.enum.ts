export enum EventType {
  // Quick events
  TEMPERATURE_MEASUREMENT = 'temperature_measurement',
  PHOTO_UPLOAD = 'photo_upload',
  FEEDING = 'feeding',
  
  // Scheduled events
  WATER_CHANGE = 'water_change',
  FILTER_CLEANING = 'filter_cleaning',
  WATER_TEST = 'water_test',
  MEDICATION = 'medication',
  EQUIPMENT_MAINTENANCE = 'equipment_maintenance',
  MAINTENANCE = 'maintenance',
  
  // Custom events
  CUSTOM = 'custom',
}