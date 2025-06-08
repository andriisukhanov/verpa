# Verpa Testing Guide

## Table of Contents
- [Overview](#overview)
- [Test Architecture](#test-architecture)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Test Types](#test-types)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

Verpa uses a comprehensive testing strategy to ensure code quality and reliability across all components:
- **Backend**: NestJS services with Jest
- **Mobile**: Flutter app with Flutter Test and Mocktail
- **Admin**: React/Next.js with Jest and React Testing Library

### Current Coverage Status
- Backend Services: ~95%
- Mobile App: ~90%
- Admin Panel: ~95%
- **Overall Coverage: ~93%**

## Test Architecture

```
verpa/
├── test/                      # Root-level tests
│   ├── e2e/                  # End-to-end tests
│   ├── integration/          # Cross-service integration tests
│   ├── performance/          # Load and stress tests
│   └── security/             # Security tests
├── backend/services/*/       # Service-specific tests
│   ├── test/
│   │   ├── unit/            # Unit tests
│   │   └── integration/     # Service integration tests
│   └── src/**/*.spec.ts     # Co-located unit tests
├── mobile/test/             # Flutter tests
│   ├── unit/               # Unit tests
│   ├── widget/             # Widget tests
│   └── integration/        # Integration tests
└── admin/test/             # Admin panel tests
    ├── unit/               # Unit tests
    └── integration/        # Integration tests
```

## Running Tests

### Quick Start
```bash
# Run all tests
./scripts/run-tests.sh all

# Run specific test type
./scripts/run-tests.sh unit
./scripts/run-tests.sh integration
./scripts/run-tests.sh e2e
./scripts/run-tests.sh security
./scripts/run-tests.sh performance
./scripts/run-tests.sh coverage
```

### Backend Tests

#### Unit Tests
```bash
# All backend unit tests
cd backend && npm test

# Specific service
cd backend/services/user-service && npm test

# Watch mode
cd backend/services/user-service && npm run test:watch

# Debug mode
cd backend/services/user-service && npm run test:debug
```

#### Integration Tests
```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
cd backend/services/user-service && npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

### Mobile Tests

#### Unit & Widget Tests
```bash
cd mobile

# All tests
flutter test

# Specific test file
flutter test test/unit/auth_bloc_test.dart

# With coverage
flutter test --coverage

# Generate coverage report
genhtml coverage/lcov.info -o coverage/html
```

#### Integration Tests
```bash
# Run on emulator/device
flutter test integration_test/app_test.dart
```

### Admin Panel Tests

```bash
cd admin

# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Test Coverage

### Viewing Coverage Reports

#### Backend Coverage
```bash
cd backend/services/user-service
npm run test:coverage
# Open coverage/lcov-report/index.html
```

#### Mobile Coverage
```bash
cd mobile
flutter test --coverage
lcov --list coverage/lcov.info
```

#### Admin Coverage
```bash
cd admin
npm run test:coverage
# Open coverage/index.html
```

### Coverage Thresholds
All components maintain minimum coverage thresholds:
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

## Test Types

### 1. Unit Tests
Test individual components in isolation.

**Backend Example:**
```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  it('should hash password on create', async () => {
    const dto = { email: 'test@example.com', password: 'password' };
    repository.create.mockResolvedValue(mockUser);
    
    await service.create(dto);
    
    expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
  });
});
```

**Mobile Example:**
```dart
void main() {
  group('AuthBloc', () => {
    late AuthBloc authBloc;
    late MockAuthService mockAuthService;

    setUp(() {
      mockAuthService = MockAuthService();
      authBloc = AuthBloc(authService: mockAuthService);
    });

    test('emits [Loading, Authenticated] when login succeeds', () async {
      when(() => mockAuthService.login(any(), any()))
          .thenAnswer((_) async => mockUser);

      expectLater(
        authBloc.stream,
        emitsInOrder([Loading(), Authenticated(mockUser)]),
      );

      authBloc.add(LoginRequested('test@example.com', 'password'));
    });
  });
}
```

### 2. Integration Tests
Test interactions between components.

```typescript
describe('User Registration Flow', () => {
  it('should register user and send verification email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'new@example.com',
        password: 'Password123!',
        username: 'newuser',
      })
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('tokens');
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
  });
});
```

### 3. E2E Tests
Test complete user workflows.

```typescript
describe('Complete User Journey', () => {
  it('should complete full aquarium management flow', async () => {
    // 1. Register
    const registerRes = await api.post('/auth/register').send(userData);
    const { accessToken } = registerRes.body.tokens;

    // 2. Create aquarium
    const aquariumRes = await api
      .post('/aquariums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(aquariumData);

    // 3. Add inhabitants
    await api
      .post(`/aquariums/${aquariumRes.body.id}/inhabitants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(inhabitantData);

    // 4. Record parameters
    await api
      .post(`/aquariums/${aquariumRes.body.id}/parameters`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(parameterData);

    // 5. Check health score
    const healthRes = await api
      .get(`/aquariums/${aquariumRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(healthRes.body.healthScore).toBeGreaterThan(0);
  });
});
```

### 4. Performance Tests
Test system performance under load.

```javascript
export default function () {
  // Authenticate
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(credentials));
  check(loginRes, { 'login successful': (r) => r.status === 200 });

  // Create aquarium
  const aquariumRes = http.post(`${BASE_URL}/aquariums`, JSON.stringify(aquariumData), {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(aquariumRes, { 'aquarium created': (r) => r.status === 201 });
}

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};
```

### 5. Security Tests
Test security vulnerabilities.

```typescript
describe('Security', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    await request(app.getHttpServer())
      .get('/aquariums')
      .query({ search: maliciousInput })
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toEqual([]);
      });
  });
});
```

## Writing Tests

### Backend Testing Guidelines

1. **Test Structure**
```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Initialize mocks and dependencies
  });

  describe('methodName', () => {
    it('should do expected behavior when condition', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

2. **Mocking Best Practices**
```typescript
// Mock factory
export const repositoryMockFactory: () => MockType<Repository<any>> = jest.fn(() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

// Usage
providers: [
  {
    provide: getRepositoryToken(User),
    useFactory: repositoryMockFactory,
  },
]
```

### Mobile Testing Guidelines

1. **Widget Testing**
```dart
testWidgets('should display loading indicator', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: BlocProvider(
        create: (_) => AuthBloc(authService: mockAuthService),
        child: LoginScreen(),
      ),
    ),
  );

  expect(find.byType(CircularProgressIndicator), findsNothing);

  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();

  expect(find.byType(CircularProgressIndicator), findsOneWidget);
});
```

2. **BLoC Testing**
```dart
blocTest<AuthBloc, AuthState>(
  'emits [Loading, Error] when login fails',
  build: () => AuthBloc(authService: mockAuthService),
  setUp: () {
    when(() => mockAuthService.login(any(), any()))
        .thenThrow(Exception('Invalid credentials'));
  },
  act: (bloc) => bloc.add(LoginRequested('test@example.com', 'wrong')),
  expect: () => [Loading(), Error('Invalid credentials')],
);
```

## CI/CD Integration

### GitHub Actions Configuration
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - uses: codecov/codecov-action@v3

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: cd mobile && flutter test --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: npm run test:e2e
      - run: docker-compose -f docker-compose.test.yml down
```

## Best Practices

### 1. Test Naming
- Use descriptive test names that explain the scenario
- Follow the pattern: "should [expected behavior] when [condition]"
- Group related tests using describe blocks

### 2. Test Data
- Use factories for creating test data
- Avoid hardcoded values
- Clean up test data after each test

### 3. Mocking
- Mock external dependencies
- Use dependency injection for easy mocking
- Verify mock interactions when relevant

### 4. Assertions
- Use specific assertions
- Test one thing per test
- Include edge cases and error scenarios

### 5. Performance
- Keep tests fast
- Use test databases/containers
- Parallelize where possible

### 6. Maintenance
- Update tests when code changes
- Remove obsolete tests
- Refactor tests to reduce duplication

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for missing async/await
   - Verify mock responses

2. **Flaky tests**
   - Add proper waits for async operations
   - Use deterministic test data
   - Isolate tests properly

3. **Coverage gaps**
   - Check coverage reports for uncovered lines
   - Add tests for error cases
   - Test edge conditions

### Debug Tips

1. **Backend debugging**
```bash
# Run specific test in debug mode
node --inspect-brk ./node_modules/.bin/jest path/to/test.spec.ts
```

2. **Mobile debugging**
```dart
// Add debug prints
debugPrint('State: ${bloc.state}');

// Use Flutter Inspector
flutter test --dart-define=FLUTTER_TEST_DEBUGGER=true
```

3. **E2E debugging**
```typescript
// Add screenshots on failure
afterEach(async () => {
  if (testFailed) {
    await page.screenshot({ path: 'failure.png' });
  }
});
```