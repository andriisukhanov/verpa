import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String emailOrUsername;
  final String password;

  const AuthLoginRequested({
    required this.emailOrUsername,
    required this.password,
  });

  @override
  List<Object> get props => [emailOrUsername, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String email;
  final String username;
  final String password;
  final String firstName;
  final String lastName;

  const AuthRegisterRequested({
    required this.email,
    required this.username,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  @override
  List<Object> get props => [email, username, password, firstName, lastName];
}

class AuthLogoutRequested extends AuthEvent {}

class AuthForgotPasswordRequested extends AuthEvent {
  final String email;

  const AuthForgotPasswordRequested({required this.email});

  @override
  List<Object> get props => [email];
}

class AuthResetPasswordRequested extends AuthEvent {
  final String token;
  final String newPassword;

  const AuthResetPasswordRequested({
    required this.token,
    required this.newPassword,
  });

  @override
  List<Object> get props => [token, newPassword];
}

class AuthVerifyEmailRequested extends AuthEvent {
  final String token;

  const AuthVerifyEmailRequested({required this.token});

  @override
  List<Object> get props => [token];
}

class AuthResendVerificationRequested extends AuthEvent {
  final String email;

  const AuthResendVerificationRequested({required this.email});

  @override
  List<Object> get props => [email];
}

class AuthUserUpdated extends AuthEvent {
  final dynamic user; // User model

  const AuthUserUpdated({required this.user});

  @override
  List<Object> get props => [user];
}