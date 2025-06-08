import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../../core/api/api_client.dart';
import '../../../core/storage/storage_service.dart';
import '../../../shared/models/user_model.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiClient apiClient;
  final StorageService storageService;
  final Logger _logger = Logger();

  AuthBloc({
    required this.apiClient,
    required this.storageService,
  }) : super(AuthInitial()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthRegisterRequested>(_onAuthRegisterRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
    on<AuthForgotPasswordRequested>(_onAuthForgotPasswordRequested);
    on<AuthResetPasswordRequested>(_onAuthResetPasswordRequested);
    on<AuthVerifyEmailRequested>(_onAuthVerifyEmailRequested);
    on<AuthResendVerificationRequested>(_onAuthResendVerificationRequested);
    on<AuthUserUpdated>(_onAuthUserUpdated);
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());
      
      final accessToken = await storageService.getAccessToken();
      if (accessToken == null) {
        emit(AuthUnauthenticated());
        return;
      }

      // Verify token by getting current user
      final response = await apiClient.getCurrentUser();
      if (response.statusCode == 200) {
        final user = User.fromJson(response.data['user']);
        await storageService.saveUser(user);
        emit(AuthAuthenticated(user: user, accessToken: accessToken));
      } else {
        await storageService.clearAuth();
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      _logger.e('Auth check failed: $e');
      await storageService.clearAuth();
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      final response = await apiClient.login(
        event.emailOrUsername,
        event.password,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final user = User.fromJson(data['user']);
        final accessToken = data['accessToken'];
        final refreshToken = data['refreshToken'];

        await apiClient.setTokens(accessToken, refreshToken);
        await storageService.saveUser(user);

        emit(AuthAuthenticated(user: user, accessToken: accessToken));
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        final errorData = e.response?.data;
        if (errorData?['message']?.contains('verify your email') == true) {
          emit(AuthEmailVerificationRequired(
            email: event.emailOrUsername,
            message: errorData['message'] ?? 'Please verify your email address',
          ));
          return;
        }
      }
      
      emit(AuthError(
        message: _getErrorMessage(e),
        errorCode: e.response?.statusCode.toString(),
      ));
    } catch (e) {
      _logger.e('Login failed: $e');
      emit(const AuthError(message: 'Login failed. Please try again.'));
    }
  }

  Future<void> _onAuthRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      final response = await apiClient.register(
        email: event.email,
        username: event.username,
        password: event.password,
        firstName: event.firstName,
        lastName: event.lastName,
      );

      if (response.statusCode == 201) {
        emit(AuthEmailVerificationRequired(
          email: event.email,
          message: 'Account created! Please check your email to verify your account.',
        ));
      }
    } on DioException catch (e) {
      emit(AuthError(
        message: _getErrorMessage(e),
        errorCode: e.response?.statusCode.toString(),
      ));
    } catch (e) {
      _logger.e('Registration failed: $e');
      emit(const AuthError(message: 'Registration failed. Please try again.'));
    }
  }

  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());
      
      await apiClient.clearTokens();
      await storageService.clearAuth();
      
      emit(AuthUnauthenticated());
    } catch (e) {
      _logger.e('Logout failed: $e');
      // Even if logout API call fails, clear local data
      await apiClient.clearTokens();
      await storageService.clearAuth();
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthForgotPasswordRequested(
    AuthForgotPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      await apiClient.forgotPassword(event.email);
      
      emit(const AuthSuccess(
        message: 'Password reset email sent. Please check your inbox.',
      ));
    } on DioException catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    } catch (e) {
      _logger.e('Forgot password failed: $e');
      emit(const AuthError(message: 'Failed to send reset email. Please try again.'));
    }
  }

  Future<void> _onAuthResetPasswordRequested(
    AuthResetPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      await apiClient.resetPassword(event.token, event.newPassword);
      
      emit(const AuthSuccess(
        message: 'Password reset successfully. You can now log in with your new password.',
      ));
    } on DioException catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    } catch (e) {
      _logger.e('Reset password failed: $e');
      emit(const AuthError(message: 'Failed to reset password. Please try again.'));
    }
  }

  Future<void> _onAuthVerifyEmailRequested(
    AuthVerifyEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      final response = await apiClient.verifyEmail(event.token);
      
      if (response.statusCode == 200) {
        emit(const AuthSuccess(
          message: 'Email verified successfully! You can now log in.',
        ));
      }
    } on DioException catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    } catch (e) {
      _logger.e('Email verification failed: $e');
      emit(const AuthError(message: 'Email verification failed. Please try again.'));
    }
  }

  Future<void> _onAuthResendVerificationRequested(
    AuthResendVerificationRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      await apiClient.resendVerification(event.email);
      
      emit(const AuthSuccess(
        message: 'Verification email sent. Please check your inbox.',
      ));
    } on DioException catch (e) {
      emit(AuthError(message: _getErrorMessage(e)));
    } catch (e) {
      _logger.e('Resend verification failed: $e');
      emit(const AuthError(message: 'Failed to resend verification. Please try again.'));
    }
  }

  Future<void> _onAuthUserUpdated(
    AuthUserUpdated event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final user = event.user as User;
      await storageService.saveUser(user);
      
      if (state is AuthAuthenticated) {
        final currentState = state as AuthAuthenticated;
        emit(AuthAuthenticated(
          user: user,
          accessToken: currentState.accessToken,
        ));
      }
    } catch (e) {
      _logger.e('User update failed: $e');
    }
  }

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