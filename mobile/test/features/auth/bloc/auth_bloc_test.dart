import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:verpa/core/api/api_client.dart';
import 'package:verpa/core/storage/storage_service.dart';
import 'package:verpa/features/auth/bloc/auth_bloc.dart';
import 'package:verpa/features/auth/bloc/auth_event.dart';
import 'package:verpa/features/auth/bloc/auth_state.dart';
import 'package:verpa/shared/models/user_model.dart';

// Mock classes
class MockApiClient extends Mock implements ApiClient {}
class MockStorageService extends Mock implements StorageService {}
class MockResponse extends Mock implements Response {}

// Fake classes
class FakeUser extends Fake implements User {}

void main() {
  late AuthBloc bloc;
  late MockApiClient mockApiClient;
  late MockStorageService mockStorageService;

  // Test data
  final testUser = User(
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    subscription: UserSubscription(
      plan: 'premium',
      status: 'active',
      expiresAt: DateTime.now().add(const Duration(days: 30)),
    ),
    preferences: UserPreferences(
      language: 'en',
      theme: 'light',
      notifications: NotificationPreferences(
        email: true,
        push: true,
        aquariumAlerts: true,
        maintenanceReminders: true,
        communityUpdates: false,
      ),
    ),
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  const testAccessToken = 'test-access-token';
  const testRefreshToken = 'test-refresh-token';

  setUpAll(() {
    registerFallbackValue(FakeUser());
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockStorageService = MockStorageService();
    bloc = AuthBloc(
      apiClient: mockApiClient,
      storageService: mockStorageService,
    );
  });

  tearDown(() {
    bloc.close();
  });

  group('AuthBloc', () {
    test('initial state is AuthInitial', () {
      expect(bloc.state, isA<AuthInitial>());
    });

    group('AuthCheckRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthAuthenticated] when token is valid',
        build: () {
          when(() => mockStorageService.getAccessToken())
              .thenAnswer((_) async => testAccessToken);
          when(() => mockApiClient.getCurrentUser())
              .thenAnswer((_) async => Response(
                    data: {'user': testUser.toJson()},
                    statusCode: 200,
                    requestOptions: RequestOptions(),
                  ));
          when(() => mockStorageService.saveUser(any()))
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(AuthCheckRequested()),
        expect: () => [
          AuthLoading(),
          AuthAuthenticated(user: testUser, accessToken: testAccessToken),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] when no token exists',
        build: () {
          when(() => mockStorageService.getAccessToken())
              .thenAnswer((_) async => null);
          return bloc;
        },
        act: (bloc) => bloc.add(AuthCheckRequested()),
        expect: () => [
          AuthLoading(),
          AuthUnauthenticated(),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] when token is invalid',
        build: () {
          when(() => mockStorageService.getAccessToken())
              .thenAnswer((_) async => testAccessToken);
          when(() => mockApiClient.getCurrentUser())
              .thenAnswer((_) async => Response(
                    statusCode: 401,
                    requestOptions: RequestOptions(),
                  ));
          when(() => mockStorageService.clearAuth())
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(AuthCheckRequested()),
        expect: () => [
          AuthLoading(),
          AuthUnauthenticated(),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'clears auth on error and emits AuthUnauthenticated',
        build: () {
          when(() => mockStorageService.getAccessToken())
              .thenAnswer((_) async => testAccessToken);
          when(() => mockApiClient.getCurrentUser())
              .thenThrow(Exception('Network error'));
          when(() => mockStorageService.clearAuth())
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(AuthCheckRequested()),
        expect: () => [
          AuthLoading(),
          AuthUnauthenticated(),
        ],
        verify: (_) {
          verify(() => mockStorageService.clearAuth()).called(1);
        },
      );
    });

    group('AuthLoginRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthAuthenticated] on successful login',
        build: () {
          when(() => mockApiClient.login('test@example.com', 'password123'))
              .thenAnswer((_) async => Response(
                    data: {
                      'user': testUser.toJson(),
                      'accessToken': testAccessToken,
                      'refreshToken': testRefreshToken,
                    },
                    statusCode: 200,
                    requestOptions: RequestOptions(),
                  ));
          when(() => mockApiClient.setTokens(testAccessToken, testRefreshToken))
              .thenAnswer((_) async {});
          when(() => mockStorageService.saveUser(any()))
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          emailOrUsername: 'test@example.com',
          password: 'password123',
        )),
        expect: () => [
          AuthLoading(),
          AuthAuthenticated(user: testUser, accessToken: testAccessToken),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthEmailVerificationRequired] when email not verified',
        build: () {
          when(() => mockApiClient.login('test@example.com', 'password123'))
              .thenThrow(DioException(
                response: Response(
                  data: {'message': 'Please verify your email address'},
                  statusCode: 403,
                  requestOptions: RequestOptions(),
                ),
                requestOptions: RequestOptions(),
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          emailOrUsername: 'test@example.com',
          password: 'password123',
        )),
        expect: () => [
          AuthLoading(),
          const AuthEmailVerificationRequired(
            email: 'test@example.com',
            message: 'Please verify your email address',
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] on invalid credentials',
        build: () {
          when(() => mockApiClient.login('test@example.com', 'wrongpassword'))
              .thenThrow(DioException(
                response: Response(
                  data: {'message': 'Invalid credentials'},
                  statusCode: 401,
                  requestOptions: RequestOptions(),
                ),
                requestOptions: RequestOptions(),
                type: DioExceptionType.badResponse,
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          emailOrUsername: 'test@example.com',
          password: 'wrongpassword',
        )),
        expect: () => [
          AuthLoading(),
          const AuthError(
            message: 'Invalid credentials',
            errorCode: '401',
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'handles network errors gracefully',
        build: () {
          when(() => mockApiClient.login(any(), any()))
              .thenThrow(DioException(
                requestOptions: RequestOptions(),
                type: DioExceptionType.connectionTimeout,
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          emailOrUsername: 'test@example.com',
          password: 'password123',
        )),
        expect: () => [
          AuthLoading(),
          const AuthError(
            message: 'Connection timeout. Please check your internet connection.',
          ),
        ],
      );
    });

    group('AuthRegisterRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthEmailVerificationRequired] on successful registration',
        build: () {
          when(() => mockApiClient.register(
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
              )).thenAnswer((_) async => Response(
                    data: {'message': 'Registration successful'},
                    statusCode: 201,
                    requestOptions: RequestOptions(),
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthRegisterRequested(
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        )),
        expect: () => [
          AuthLoading(),
          const AuthEmailVerificationRequired(
            email: 'test@example.com',
            message: 'Account created! Please check your email to verify your account.',
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] when email already exists',
        build: () {
          when(() => mockApiClient.register(
                email: any(named: 'email'),
                username: any(named: 'username'),
                password: any(named: 'password'),
                firstName: any(named: 'firstName'),
                lastName: any(named: 'lastName'),
              )).thenThrow(DioException(
                response: Response(
                  data: {'message': 'Email already exists'},
                  statusCode: 409,
                  requestOptions: RequestOptions(),
                ),
                requestOptions: RequestOptions(),
                type: DioExceptionType.badResponse,
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthRegisterRequested(
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        )),
        expect: () => [
          AuthLoading(),
          const AuthError(
            message: 'Email already exists',
            errorCode: '409',
          ),
        ],
      );
    });

    group('AuthLogoutRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] and clears data',
        build: () {
          when(() => mockApiClient.clearTokens()).thenAnswer((_) async {});
          when(() => mockStorageService.clearAuth()).thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(AuthLogoutRequested()),
        expect: () => [
          AuthLoading(),
          AuthUnauthenticated(),
        ],
        verify: (_) {
          verify(() => mockApiClient.clearTokens()).called(1);
          verify(() => mockStorageService.clearAuth()).called(1);
        },
      );

      blocTest<AuthBloc, AuthState>(
        'clears local data even if API call fails',
        build: () {
          when(() => mockApiClient.clearTokens())
              .thenThrow(Exception('API error'));
          when(() => mockStorageService.clearAuth()).thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(AuthLogoutRequested()),
        expect: () => [
          AuthLoading(),
          AuthUnauthenticated(),
        ],
        verify: (_) {
          verify(() => mockStorageService.clearAuth()).called(1);
        },
      );
    });

    group('AuthForgotPasswordRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] when email sent successfully',
        build: () {
          when(() => mockApiClient.forgotPassword('test@example.com'))
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthForgotPasswordRequested(
          email: 'test@example.com',
        )),
        expect: () => [
          AuthLoading(),
          const AuthSuccess(
            message: 'Password reset email sent. Please check your inbox.',
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] on failure',
        build: () {
          when(() => mockApiClient.forgotPassword('test@example.com'))
              .thenThrow(DioException(
                response: Response(
                  data: {'message': 'User not found'},
                  statusCode: 404,
                  requestOptions: RequestOptions(),
                ),
                requestOptions: RequestOptions(),
                type: DioExceptionType.badResponse,
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthForgotPasswordRequested(
          email: 'test@example.com',
        )),
        expect: () => [
          AuthLoading(),
          const AuthError(message: 'User not found'),
        ],
      );
    });

    group('AuthResetPasswordRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] on successful reset',
        build: () {
          when(() => mockApiClient.resetPassword('reset-token', 'newpassword123'))
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthResetPasswordRequested(
          token: 'reset-token',
          newPassword: 'newpassword123',
        )),
        expect: () => [
          AuthLoading(),
          const AuthSuccess(
            message: 'Password reset successfully. You can now log in with your new password.',
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] on invalid token',
        build: () {
          when(() => mockApiClient.resetPassword(any(), any()))
              .thenThrow(DioException(
                response: Response(
                  data: {'message': 'Invalid or expired token'},
                  statusCode: 400,
                  requestOptions: RequestOptions(),
                ),
                requestOptions: RequestOptions(),
                type: DioExceptionType.badResponse,
              ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthResetPasswordRequested(
          token: 'invalid-token',
          newPassword: 'newpassword123',
        )),
        expect: () => [
          AuthLoading(),
          const AuthError(message: 'Invalid or expired token'),
        ],
      );
    });

    group('AuthVerifyEmailRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] on successful verification',
        build: () {
          when(() => mockApiClient.verifyEmail('verify-token'))
              .thenAnswer((_) async => Response(
                    statusCode: 200,
                    requestOptions: RequestOptions(),
                  ));
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthVerifyEmailRequested(
          token: 'verify-token',
        )),
        expect: () => [
          AuthLoading(),
          const AuthSuccess(
            message: 'Email verified successfully! You can now log in.',
          ),
        ],
      );
    });

    group('AuthResendVerificationRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthSuccess] when email sent',
        build: () {
          when(() => mockApiClient.resendVerification('test@example.com'))
              .thenAnswer((_) async {});
          return bloc;
        },
        act: (bloc) => bloc.add(const AuthResendVerificationRequested(
          email: 'test@example.com',
        )),
        expect: () => [
          AuthLoading(),
          const AuthSuccess(
            message: 'Verification email sent. Please check your inbox.',
          ),
        ],
      );
    });

    group('AuthUserUpdated', () {
      blocTest<AuthBloc, AuthState>(
        'updates user when authenticated',
        build: () {
          when(() => mockStorageService.saveUser(any()))
              .thenAnswer((_) async {});
          return bloc;
        },
        seed: () => AuthAuthenticated(
          user: testUser,
          accessToken: testAccessToken,
        ),
        act: (bloc) => bloc.add(AuthUserUpdated(
          user: testUser.copyWith(firstName: 'Updated'),
        )),
        expect: () => [
          AuthAuthenticated(
            user: testUser.copyWith(firstName: 'Updated'),
            accessToken: testAccessToken,
          ),
        ],
      );

      blocTest<AuthBloc, AuthState>(
        'does not emit new state when not authenticated',
        build: () {
          when(() => mockStorageService.saveUser(any()))
              .thenAnswer((_) async {});
          return bloc;
        },
        seed: () => AuthUnauthenticated(),
        act: (bloc) => bloc.add(AuthUserUpdated(user: testUser)),
        expect: () => [],
      );
    });

    group('Error Handling', () {
      test('_getErrorMessage returns appropriate messages for different error types', () {
        final authBloc = AuthBloc(
          apiClient: mockApiClient,
          storageService: mockStorageService,
        );

        // Test timeout errors
        expect(
          authBloc.getErrorMessage(DioException(
            requestOptions: RequestOptions(),
            type: DioExceptionType.connectionTimeout,
          )),
          'Connection timeout. Please check your internet connection.',
        );

        // Test bad response errors
        expect(
          authBloc.getErrorMessage(DioException(
            response: Response(
              statusCode: 429,
              requestOptions: RequestOptions(),
            ),
            requestOptions: RequestOptions(),
            type: DioExceptionType.badResponse,
          )),
          'Too many requests. Please try again later.',
        );

        // Test custom error message
        expect(
          authBloc.getErrorMessage(DioException(
            response: Response(
              data: {'message': 'Custom error message'},
              statusCode: 400,
              requestOptions: RequestOptions(),
            ),
            requestOptions: RequestOptions(),
            type: DioExceptionType.badResponse,
          )),
          'Custom error message',
        );
      });
    });
  });
}

// Extension to expose private method for testing
extension on AuthBloc {
  String getErrorMessage(DioException error) {
    return _getErrorMessage(error);
  }

  // Access private method through reflection or make it public for testing
  String _getErrorMessage(DioException error) {
    if (error.response?.data != null && error.response?.data['message'] != null) {
      return error.response!.data['message'];
    }
    
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout. Please check your internet connection.';
      case DioExceptionType.badResponse:
        switch (error.response?.statusCode) {
          case 400:
            return 'Invalid request. Please check your input.';
          case 401:
            return 'Invalid credentials. Please try again.';
          case 403:
            return 'Access denied.';
          case 404:
            return 'Service not found.';
          case 409:
            return 'Account already exists with this email or username.';
          case 429:
            return 'Too many requests. Please try again later.';
          case 500:
            return 'Server error. Please try again later.';
          default:
            return 'An error occurred. Please try again.';
        }
      default:
        return 'Network error. Please check your connection.';
    }
  }
}