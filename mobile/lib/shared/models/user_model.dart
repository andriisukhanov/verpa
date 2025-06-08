import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class User extends Equatable {
  final String id;
  final String email;
  final String username;
  final String firstName;
  final String lastName;
  final bool emailVerified;
  final bool isActive;
  final String subscriptionType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final UserPreferences? preferences;
  final List<AuthProvider> authProviders;

  const User({
    required this.id,
    required this.email,
    required this.username,
    required this.firstName,
    required this.lastName,
    required this.emailVerified,
    required this.isActive,
    required this.subscriptionType,
    required this.createdAt,
    required this.updatedAt,
    this.preferences,
    required this.authProviders,
  });

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  User copyWith({
    String? id,
    String? email,
    String? username,
    String? firstName,
    String? lastName,
    bool? emailVerified,
    bool? isActive,
    String? subscriptionType,
    DateTime? createdAt,
    DateTime? updatedAt,
    UserPreferences? preferences,
    List<AuthProvider>? authProviders,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      username: username ?? this.username,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      emailVerified: emailVerified ?? this.emailVerified,
      isActive: isActive ?? this.isActive,
      subscriptionType: subscriptionType ?? this.subscriptionType,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      preferences: preferences ?? this.preferences,
      authProviders: authProviders ?? this.authProviders,
    );
  }

  @override
  List<Object?> get props => [
        id,
        email,
        username,
        firstName,
        lastName,
        emailVerified,
        isActive,
        subscriptionType,
        createdAt,
        updatedAt,
        preferences,
        authProviders,
      ];
}

@JsonSerializable()
class UserPreferences extends Equatable {
  final String timezone;
  final String language;
  final String units;
  final NotificationSettings notifications;

  const UserPreferences({
    required this.timezone,
    required this.language,
    required this.units,
    required this.notifications,
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) => _$UserPreferencesFromJson(json);
  Map<String, dynamic> toJson() => _$UserPreferencesToJson(this);

  UserPreferences copyWith({
    String? timezone,
    String? language,
    String? units,
    NotificationSettings? notifications,
  }) {
    return UserPreferences(
      timezone: timezone ?? this.timezone,
      language: language ?? this.language,
      units: units ?? this.units,
      notifications: notifications ?? this.notifications,
    );
  }

  @override
  List<Object> get props => [timezone, language, units, notifications];
}

@JsonSerializable()
class NotificationSettings extends Equatable {
  final bool email;
  final bool push;
  final bool sms;
  final bool marketing;

  const NotificationSettings({
    required this.email,
    required this.push,
    required this.sms,
    required this.marketing,
  });

  factory NotificationSettings.fromJson(Map<String, dynamic> json) => _$NotificationSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$NotificationSettingsToJson(this);

  NotificationSettings copyWith({
    bool? email,
    bool? push,
    bool? sms,
    bool? marketing,
  }) {
    return NotificationSettings(
      email: email ?? this.email,
      push: push ?? this.push,
      sms: sms ?? this.sms,
      marketing: marketing ?? this.marketing,
    );
  }

  @override
  List<Object> get props => [email, push, sms, marketing];
}

@JsonSerializable()
class AuthProvider extends Equatable {
  final String provider;
  final String providerId;
  final String email;
  final DateTime linkedAt;

  const AuthProvider({
    required this.provider,
    required this.providerId,
    required this.email,
    required this.linkedAt,
  });

  factory AuthProvider.fromJson(Map<String, dynamic> json) => _$AuthProviderFromJson(json);
  Map<String, dynamic> toJson() => _$AuthProviderToJson(this);

  @override
  List<Object> get props => [provider, providerId, email, linkedAt];
}