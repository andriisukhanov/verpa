export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/verpa-aquarium',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    bucket: process.env.STORAGE_BUCKET || 'aquarium-images',
    region: process.env.STORAGE_REGION || 'us-east-1',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  limits: {
    maxAquariumsPerUser: {
      basic: 3,
      premium: 10,
      professional: -1, // unlimited
    },
    maxEquipmentPerAquarium: 50,
    maxInhabitantsPerAquarium: 100,
    maxImageSize: 5 * 1024 * 1024, // 5MB
  },
});