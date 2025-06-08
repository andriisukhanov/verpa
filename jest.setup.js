// Увеличиваем таймаут для асинхронных операций
jest.setTimeout(10000);

// Мокаем console методы для чистоты вывода тестов
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Глобальные моки для часто используемых модулей
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Сброс всех моков после каждого теста
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Очистка всех таймеров
afterAll(() => {
  jest.clearAllTimers();
});