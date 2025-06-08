import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginSuccess = new Rate('login_success');
const aquariumCreated = new Rate('aquarium_created');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.1'],             // Error rate must be below 10%
    login_success: ['rate>0.9'],      // Login success rate must be above 90%
    aquarium_created: ['rate>0.8'],   // Aquarium creation success rate must be above 80%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data generator
function generateUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `loadtest_${timestamp}_${random}@example.com`,
    username: `loadtest_${timestamp}_${random}`,
    password: 'LoadTest123!',
    firstName: 'Load',
    lastName: 'Test',
  };
}

function generateAquarium() {
  const types = ['freshwater', 'saltwater', 'brackish'];
  const locations = ['Living Room', 'Bedroom', 'Office', 'Basement'];
  
  return {
    name: `Tank ${Date.now()}`,
    type: types[Math.floor(Math.random() * types.length)],
    volume: Math.floor(Math.random() * 400) + 50,
    volumeUnit: 'liters',
    dimensions: {
      length: Math.floor(Math.random() * 150) + 50,
      width: Math.floor(Math.random() * 60) + 30,
      height: Math.floor(Math.random() * 60) + 30,
      unit: 'cm',
    },
    waterType: types[Math.floor(Math.random() * types.length)],
    description: 'Load test aquarium',
    location: locations[Math.floor(Math.random() * locations.length)],
  };
}

// Main test scenario
export default function () {
  // 1. Register new user
  const user = generateUser();
  let registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  const registerSuccess = check(registerRes, {
    'register status is 201': (r) => r.status === 201,
    'register has tokens': (r) => r.json('tokens') !== null,
  });
  
  errorRate.add(!registerSuccess);
  
  if (!registerSuccess) {
    console.error(`Registration failed: ${registerRes.status} - ${registerRes.body}`);
    return;
  }
  
  const tokens = registerRes.json('tokens');
  const authHeader = { Authorization: `Bearer ${tokens.accessToken}` };
  
  sleep(1);
  
  // 2. Login test
  let loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has tokens': (r) => r.json('tokens') !== null,
  });
  
  loginSuccess.add(loginOk);
  errorRate.add(!loginOk);
  
  sleep(1);
  
  // 3. Get user profile
  let profileRes = http.get(`${BASE_URL}/users/profile`, {
    headers: authHeader,
  });
  
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
    'profile has email': (r) => r.json('email') === user.email,
  });
  
  sleep(1);
  
  // 4. Create multiple aquariums
  for (let i = 0; i < 3; i++) {
    const aquarium = generateAquarium();
    let createAquariumRes = http.post(
      `${BASE_URL}/aquariums`,
      JSON.stringify(aquarium),
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      }
    );
    
    const aquariumOk = check(createAquariumRes, {
      'aquarium created': (r) => r.status === 201,
      'aquarium has id': (r) => r.json('id') !== null,
    });
    
    aquariumCreated.add(aquariumOk);
    errorRate.add(!aquariumOk);
    
    if (aquariumOk) {
      const aquariumId = createAquariumRes.json('id');
      
      // 5. Add water parameters
      const parameters = {
        temperature: 75 + Math.random() * 10,
        ph: 6.5 + Math.random() * 1.5,
        ammonia: Math.random() * 0.25,
        nitrite: Math.random() * 0.25,
        nitrate: Math.random() * 40,
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
      
      check(paramsRes, {
        'parameters recorded': (r) => r.status === 201,
      });
      
      sleep(0.5);
      
      // 6. Get aquarium details
      let aquariumDetailsRes = http.get(
        `${BASE_URL}/aquariums/${aquariumId}`,
        {
          headers: authHeader,
        }
      );
      
      check(aquariumDetailsRes, {
        'aquarium details retrieved': (r) => r.status === 200,
        'aquarium has health score': (r) => r.json('healthScore') !== null,
      });
    }
    
    sleep(1);
  }
  
  // 7. List user aquariums
  let listAquariumsRes = http.get(`${BASE_URL}/aquariums`, {
    headers: authHeader,
  });
  
  check(listAquariumsRes, {
    'list aquariums status is 200': (r) => r.status === 200,
    'has aquariums': (r) => r.json('items.length') > 0,
  });
  
  // 8. Get analytics
  let analyticsRes = http.get(`${BASE_URL}/analytics/dashboard`, {
    headers: authHeader,
  });
  
  check(analyticsRes, {
    'analytics retrieved': (r) => r.status === 200,
  });
  
  sleep(2);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
}