import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/localization/app_localizations.dart';

class BiometricService {
  static final LocalAuthentication _localAuth = LocalAuthentication();
  static const String _biometricEnabledKey = 'verpa_biometric_enabled';
  static const String _biometricTypeKey = 'verpa_biometric_type';

  // Check if device supports biometrics
  static Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }

  // Get available biometric types
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  // Check if biometric auth is enabled
  static Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_biometricEnabledKey) ?? false;
  }

  // Enable biometric authentication
  static Future<bool> enableBiometric() async {
    try {
      final isAvailable = await isBiometricAvailable();
      if (!isAvailable) return false;

      // First authenticate to enable
      final authenticated = await authenticate(
        reason: 'Enable biometric authentication',
      );

      if (authenticated) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool(_biometricEnabledKey, true);
        
        // Store the type of biometric
        final biometrics = await getAvailableBiometrics();
        if (biometrics.isNotEmpty) {
          await prefs.setString(_biometricTypeKey, biometrics.first.toString());
        }
        
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  // Disable biometric authentication
  static Future<bool> disableBiometric() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_biometricEnabledKey, false);
      await prefs.remove(_biometricTypeKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Authenticate with biometrics
  static Future<bool> authenticate({
    required String reason,
    bool stickyAuth = true,
    bool sensitiveTransaction = true,
    bool biometricOnly = false,
  }) async {
    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          stickyAuth: stickyAuth,
          sensitiveTransaction: sensitiveTransaction,
          biometricOnly: biometricOnly,
        ),
      );
      
      return authenticated;
    } catch (e) {
      return false;
    }
  }

  // Get biometric icon based on available type
  static Future<IconData> getBiometricIcon() async {
    final biometrics = await getAvailableBiometrics();
    
    if (biometrics.contains(BiometricType.face)) {
      return Icons.face;
    } else if (biometrics.contains(BiometricType.fingerprint)) {
      return Icons.fingerprint;
    } else if (biometrics.contains(BiometricType.iris)) {
      return Icons.remove_red_eye;
    }
    
    return Icons.security;
  }

  // Get biometric type name
  static Future<String> getBiometricTypeName(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final biometrics = await getAvailableBiometrics();
    
    if (biometrics.isEmpty) {
      return l10n?.get('biometric_not_available') ?? 'Biometric not available';
    }
    
    if (biometrics.contains(BiometricType.face)) {
      return l10n?.get('face_id') ?? 'Face ID';
    } else if (biometrics.contains(BiometricType.fingerprint)) {
      return l10n?.get('fingerprint') ?? 'Fingerprint';
    } else if (biometrics.contains(BiometricType.iris)) {
      return l10n?.get('iris_scan') ?? 'Iris Scan';
    }
    
    return l10n?.get('biometric') ?? 'Biometric';
  }

  // Stop authentication (cancel ongoing auth)
  static Future<bool> stopAuthentication() async {
    try {
      return await _localAuth.stopAuthentication();
    } catch (e) {
      return false;
    }
  }
}