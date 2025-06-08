export default () => ({
  app: {
    name: process.env.SERVICE_NAME || 'media-service',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3005,
    version: process.env.APP_VERSION || '1.0.0',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'minio', // minio, s3
    endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'verpa_minio_admin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'verpa_minio_password_2024',
    bucket: process.env.STORAGE_BUCKET || 'verpa-uploads',
    publicBucket: process.env.STORAGE_PUBLIC_BUCKET || 'verpa-public',
    useSSL: process.env.STORAGE_USE_SSL === 'true',
    port: parseInt(process.env.STORAGE_PORT, 10) || 9000,
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    maxFiles: parseInt(process.env.MAX_FILES, 10) || 10,
    allowedMimeTypes: {
      images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf'],
      videos: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    },
  },
  image: {
    thumbnails: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 800, height: 800 },
    },
    quality: parseInt(process.env.IMAGE_QUALITY, 10) || 85,
    format: process.env.IMAGE_FORMAT || 'webp',
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'media-service',
    groupId: process.env.KAFKA_GROUP_ID || 'media-service-group',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  security: {
    signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY, 10) || 3600, // 1 hour
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
});