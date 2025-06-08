import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';
import '../../shared/models/user_model.dart';

class StorageService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  static late SharedPreferences _prefs;
  static late Box _userBox;
  static late Box _settingsBox;
  static late Box _cacheBox;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    
    // Initialize Hive boxes
    _userBox = await Hive.openBox(AppConstants.userBoxName);
    _settingsBox = await Hive.openBox(AppConstants.settingsBoxName);
    _cacheBox = await Hive.openBox(AppConstants.cacheBoxName);
  }

  // Token management (secure storage)
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: AppConstants.accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: AppConstants.refreshTokenKey);
  }

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _secureStorage.write(key: AppConstants.accessTokenKey, value: accessToken);
    await _secureStorage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: AppConstants.accessTokenKey);
    await _secureStorage.delete(key: AppConstants.refreshTokenKey);
  }

  // User data management
  Future<void> saveUser(User user) async {
    await _userBox.put(AppConstants.userDataKey, user.toJson());
  }

  Future<User?> getUser() async {
    final userData = _userBox.get(AppConstants.userDataKey);
    if (userData != null) {
      return User.fromJson(Map<String, dynamic>.from(userData));
    }
    return null;
  }

  Future<void> clearUser() async {
    await _userBox.delete(AppConstants.userDataKey);
  }

  // App settings (shared preferences)
  Future<void> setOnboardingComplete(bool completed) async {
    await _prefs.setBool(AppConstants.onboardingCompleteKey, completed);
  }

  bool getOnboardingComplete() {
    return _prefs.getBool(AppConstants.onboardingCompleteKey) ?? false;
  }

  Future<void> setThemeMode(String themeMode) async {
    await _prefs.setString(AppConstants.themeKey, themeMode);
  }

  String getThemeMode() {
    return _prefs.getString(AppConstants.themeKey) ?? 'system';
  }

  Future<void> setLanguage(String languageCode) async {
    await _prefs.setString(AppConstants.languageKey, languageCode);
  }

  String getLanguage() {
    return _prefs.getString(AppConstants.languageKey) ?? 'en';
  }

  // Settings management (Hive)
  Future<void> saveSetting(String key, dynamic value) async {
    await _settingsBox.put(key, value);
  }

  T? getSetting<T>(String key, {T? defaultValue}) {
    return _settingsBox.get(key, defaultValue: defaultValue) as T?;
  }

  Future<void> deleteSetting(String key) async {
    await _settingsBox.delete(key);
  }

  // Cache management (Hive)
  Future<void> cacheData(String key, Map<String, dynamic> data, {Duration? ttl}) async {
    final cacheItem = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'ttl': ttl?.inMilliseconds,
    };
    await _cacheBox.put(key, cacheItem);
  }

  Future<Map<String, dynamic>?> getCachedData(String key) async {
    final cacheItem = _cacheBox.get(key);
    if (cacheItem == null) return null;

    final timestamp = cacheItem['timestamp'] as int;
    final ttl = cacheItem['ttl'] as int?;
    
    if (ttl != null) {
      final expiryTime = timestamp + ttl;
      if (DateTime.now().millisecondsSinceEpoch > expiryTime) {
        await _cacheBox.delete(key);
        return null;
      }
    }

    return Map<String, dynamic>.from(cacheItem['data']);
  }

  Future<void> clearCache() async {
    await _cacheBox.clear();
  }

  Future<void> clearExpiredCache() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final keysToDelete = <String>[];

    for (final entry in _cacheBox.toMap().entries) {
      final cacheItem = entry.value;
      if (cacheItem is Map) {
        final timestamp = cacheItem['timestamp'] as int?;
        final ttl = cacheItem['ttl'] as int?;
        
        if (timestamp != null && ttl != null) {
          final expiryTime = timestamp + ttl;
          if (now > expiryTime) {
            keysToDelete.add(entry.key);
          }
        }
      }
    }

    for (final key in keysToDelete) {
      await _cacheBox.delete(key);
    }
  }

  // Convenience methods
  Future<void> clearAuth() async {
    await clearTokens();
    await clearUser();
  }

  Future<void> clearAll() async {
    await clearAuth();
    await _settingsBox.clear();
    await _cacheBox.clear();
    await _prefs.clear();
  }

  // Backup and restore (for debugging/testing)
  Future<Map<String, dynamic>> exportSettings() async {
    return {
      'settings': _settingsBox.toMap(),
      'prefs': {
        AppConstants.onboardingCompleteKey: getOnboardingComplete(),
        AppConstants.themeKey: getThemeMode(),
        AppConstants.languageKey: getLanguage(),
      },
    };
  }

  Future<void> importSettings(Map<String, dynamic> data) async {
    // Import settings
    if (data['settings'] != null) {
      final settings = data['settings'] as Map<String, dynamic>;
      for (final entry in settings.entries) {
        await _settingsBox.put(entry.key, entry.value);
      }
    }

    // Import preferences
    if (data['prefs'] != null) {
      final prefs = data['prefs'] as Map<String, dynamic>;
      for (final entry in prefs.entries) {
        if (entry.value is bool) {
          await _prefs.setBool(entry.key, entry.value);
        } else if (entry.value is String) {
          await _prefs.setString(entry.key, entry.value);
        } else if (entry.value is int) {
          await _prefs.setInt(entry.key, entry.value);
        } else if (entry.value is double) {
          await _prefs.setDouble(entry.key, entry.value);
        }
      }
    }
  }
}