import 'package:equatable/equatable.dart';
import '../../../shared/models/user_model.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final User user;
  final String accessToken;

  const AuthAuthenticated({
    required this.user,
    required this.accessToken,
  });

  @override
  List<Object> get props => [user, accessToken];
}

class AuthUnauthenticated extends AuthState {}

class AuthEmailVerificationRequired extends AuthState {
  final String email;
  final String message;

  const AuthEmailVerificationRequired({
    required this.email,
    required this.message,
  });

  @override
  List<Object> get props => [email, message];
}

class AuthSuccess extends AuthState {
  final String message;

  const AuthSuccess({required this.message});

  @override
  List<Object> get props => [message];
}

class AuthError extends AuthState {
  final String message;
  final String? errorCode;

  const AuthError({
    required this.message,
    this.errorCode,
  });

  @override
  List<Object?> get props => [message, errorCode];
}