import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success_rate');

// Stress test configuration - push system to its limits
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 2000 },  // Ramp up to 2000 users
    { duration: '10m', target: 2000 }, // Stay at 2000 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% of requests must complete below 2s
    errors: ['rate<0.5'],              // Error rate must be below 50%
    success_rate: ['rate>0.5'],        // Success rate must be above 50%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test users pool
const testUsers = [];
const POOL_SIZE = 100;

// Setup function - create test users pool
export function setup() {
  console.log('Creating test users pool...');
  
  for (let i = 0; i < POOL_SIZE; i++) {
    const user = {
      email: `stresstest_${i}_${Date.now()}@example.com`,
      username: `stresstest_${i}_${Date.now()}`,
      password: 'StressTest123!',
      firstName: 'Stress',
      lastName: 'Test',
    };
    
    const res = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify(user),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (res.status === 201) {
      testUsers.push({
        ...user,
        token: res.json('tokens.accessToken'),
        userId: res.json('user.id'),
      });
    }
  }
  
  console.log(`Created ${testUsers.length} test users`);
  return { testUsers };
}

// Main stress test scenario
export default function (data) {
  const { testUsers } = data;
  
  if (testUsers.length === 0) {
    console.error('No test users available');
    return;
  }
  
  // Pick a random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const authHeader = { Authorization: `Bearer ${user.token}` };
  
  // Scenario distribution
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Read operations (lightweight)
    performReadOperations(authHeader);
  } else if (scenario < 0.6) {
    // 30% - Write operations (medium)
    performWriteOperations(authHeader);
  } else if (scenario < 0.8) {
    // 20% - Analytics operations (heavy)
    performAnalyticsOperations(authHeader);
  } else {
    // 20% - Mixed operations
    performMixedOperations(authHeader);
  }
}

function performReadOperations(authHeader) {
  // Get user profile
  let profileRes = http.get(`${BASE_URL}/users/profile`, {
    headers: authHeader,
  });
  
  const profileOk = check(profileRes, {
    'profile retrieved': (r) => r.status === 200,
  });
  
  successRate.add(profileOk);
  errorRate.add(!profileOk);
  
  // List aquariums
  let aquariumsRes = http.get(`${BASE_URL}/aquariums`, {
    headers: authHeader,
  });
  
  const aquariumsOk = check(aquariumsRes, {
    'aquariums listed': (r) => r.status === 200,
  });
  
  successRate.add(aquariumsOk);
  errorRate.add(!aquariumsOk);
  
  // Get public aquariums
  let publicRes = http.get(`${BASE_URL}/aquariums/public?limit=10`);
  
  check(publicRes, {
    'public aquariums retrieved': (r) => r.status === 200,
  });
  
  sleep(0.5);
}

function performWriteOperations(authHeader) {
  // Create aquarium
  const aquarium = {
    name: `Stress Tank ${Date.now()}`,
    type: 'freshwater',
    volume: 100,
    volumeUnit: 'liters',
    dimensions: {
      length: 100,
      width: 40,
      height: 50,
      unit: 'cm',
    },
    waterType: 'freshwater',
    description: 'Stress test aquarium',
    location: 'Test Lab',
  };
  
  let createRes = http.post(
    `${BASE_URL}/aquariums`,
    JSON.stringify(aquarium),
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    }
  );
  
  const createOk = check(createRes, {
    'aquarium created': (r) => r.status === 201,
  });
  
  successRate.add(createOk);
  errorRate.add(!createOk);
  
  if (createOk) {
    const aquariumId = createRes.json('id');
    
    // Record parameters
    const parameters = {
      temperature: 78,
      ph: 7.2,
      ammonia: 0,
      nitrite: 0,
      nitrate: 10,
    };
    
    let paramsRes = http.post(
      `${BASE_URL}/aquariums/${aquariumId}/parameters`,
      JSON.stringify(parameters),
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      }
    );
    
    const paramsOk = check(paramsRes, {
      'parameters recorded': (r) => r.status === 201,
    });
    
    successRate.add(paramsOk);
    errorRate.add(!paramsOk);
  }
  
  sleep(0.5);
}

function performAnalyticsOperations(authHeader) {
  // Get dashboard analytics
  let dashboardRes = http.get(`${BASE_URL}/analytics/dashboard`, {
    headers: authHeader,
  });
  
  const dashboardOk = check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
  });
  
  successRate.add(dashboardOk);
  errorRate.add(!dashboardOk);
  
  // Get user statistics
  let statsRes = http.get(`${BASE_URL}/analytics/user/stats`, {
    headers: authHeader,
  });
  
  const statsOk = check(statsRes, {
    'stats retrieved': (r) => r.status === 200,
  });
  
  successRate.add(statsOk);
  errorRate.add(!statsOk);
  
  // Get trends
  let trendsRes = http.get(
    `${BASE_URL}/analytics/trends?period=30d`,
    {
      headers: authHeader,
    }
  );
  
  check(trendsRes, {
    'trends retrieved': (r) => r.status === 200,
  });
  
  sleep(1);
}

function performMixedOperations(authHeader) {
  // Simulate real user behavior with mixed operations
  
  // 1. Check notifications
  let notificationsRes = http.get(`${BASE_URL}/notifications`, {
    headers: authHeader,
  });
  
  check(notificationsRes, {
    'notifications retrieved': (r) => r.status === 200,
  });
  
  // 2. Search aquariums
  let searchRes = http.get(
    `${BASE_URL}/aquariums?search=tank&limit=5`,
    {
      headers: authHeader,
    }
  );
  
  check(searchRes, {
    'search completed': (r) => r.status === 200,
  });
  
  // 3. Create event
  const event = {
    title: 'Stress Test Event',
    description: 'Automated test event',
    type: 'maintenance',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 90000000).toISOString(),
  };
  
  let eventRes = http.post(
    `${BASE_URL}/events`,
    JSON.stringify(event),
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    }
  );
  
  const eventOk = check(eventRes, {
    'event created': (r) => r.status === 201,
  });
  
  successRate.add(eventOk);
  errorRate.add(!eventOk);
  
  // 4. Update profile
  const profileUpdate = {
    bio: `Stress test bio ${Date.now()}`,
    location: 'Stress Test City',
  };
  
  let updateRes = http.put(
    `${BASE_URL}/users/profile`,
    JSON.stringify(profileUpdate),
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    }
  );
  
  check(updateRes, {
    'profile updated': (r) => r.status === 200,
  });
  
  sleep(1);
}