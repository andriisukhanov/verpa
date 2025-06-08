export const configuration = () => ({
  service: {
    name: process.env.SERVICE_NAME || 'subscription-service',
    port: parseInt(process.env.PORT, 10) || 3007,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://verpa_admin:verpa_secure_password_2024@localhost:27017/verpa_subscriptions?authSource=admin',
    },
  },
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'subscription-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'subscription-service-group',
    topics: {
      subscriptionEvents: 'subscription.events',
      paymentEvents: 'payment.events',
      userEvents: 'user.events',
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_dummy',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy',
  },
  subscription: {
    plans: {
      free: {
        id: 'free',
        name: 'Free Plan',
        price: 0,
        interval: 'month',
        features: {
          maxAquariums: 1,
          maxPhotosPerAquarium: 5,
          waterParameterHistory: 30, // days
          aiRecommendations: false,
          exportReports: false,
          prioritySupport: false,
        },
      },
      hobby: {
        id: 'hobby',
        name: 'Hobby Plan',
        price: 9.99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_HOBBY_PRICE_ID || 'price_hobby',
        features: {
          maxAquariums: 3,
          maxPhotosPerAquarium: 50,
          waterParameterHistory: 90, // days
          aiRecommendations: true,
          exportReports: true,
          prioritySupport: false,
        },
      },
      pro: {
        id: 'pro',
        name: 'Professional Plan',
        price: 29.99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
        features: {
          maxAquariums: 10,
          maxPhotosPerAquarium: 200,
          waterParameterHistory: 365, // days
          aiRecommendations: true,
          exportReports: true,
          prioritySupport: true,
        },
      },
      business: {
        id: 'business',
        name: 'Business Plan',
        price: 99.99,
        interval: 'month',
        stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business',
        features: {
          maxAquariums: -1, // unlimited
          maxPhotosPerAquarium: -1, // unlimited
          waterParameterHistory: -1, // unlimited
          aiRecommendations: true,
          exportReports: true,
          prioritySupport: true,
          apiAccess: true,
          customBranding: true,
        },
      },
    },
    trial: {
      enabled: true,
      durationDays: parseInt(process.env.TRIAL_DURATION_DAYS, 10) || 14,
      defaultPlan: 'pro', // Trial gives access to pro features
    },
    grace: {
      periodDays: parseInt(process.env.GRACE_PERIOD_DAYS, 10) || 7,
    },
  },
  payment: {
    currency: process.env.PAYMENT_CURRENCY || 'usd',
    taxRate: parseFloat(process.env.TAX_RATE || '0'),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'jwt-secret-key',
    apiKey: process.env.INTERNAL_API_KEY || 'internal-api-key',
  },
});