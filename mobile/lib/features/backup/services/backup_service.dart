import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:archive/archive.dart';

import '../models/backup_data.dart';
import '../../aquarium/services/aquarium_service.dart';
import '../../water_change/services/water_change_service.dart';
import '../../maintenance/services/maintenance_service.dart';
import '../../expenses/services/expense_service.dart';
import '../../barcode_scanner/services/barcode_service.dart';
import '../../disease_detection/services/disease_detection_service.dart';
import '../../feeding/services/feeding_service.dart';
import '../../social/services/social_service.dart';
import '../../settings/services/settings_service.dart';

class BackupService {
  static const String _backupHistoryKey = 'verpa_backup_history';
  static const String _autoBackupKey = 'verpa_auto_backup_enabled';
  static const String _lastBackupKey = 'verpa_last_backup_date';
  static const String _backupLocationKey = 'verpa_backup_location';
  
  static final _uuid = const Uuid();

  // Create backup
  static Future<BackupData> createBackup({
    BackupType type = BackupType.manual,
    List<String>? specificCollections,
  }) async {
    try {
      // Get device info
      final deviceInfo = await _getDeviceInfo();
      final packageInfo = await PackageInfo.fromPlatform();
      
      // Collect all data
      final data = await _collectAllData(specificCollections);
      
      // Calculate metadata
      final metadata = _calculateMetadata(data);
      
      // Create backup object
      final backup = BackupData(
        id: _uuid.v4(),
        createdAt: DateTime.now(),
        appVersion: packageInfo.version,
        deviceInfo: deviceInfo,
        data: data,
        metadata: metadata,
      );
      
      return backup;
    } catch (e) {
      throw Exception('Failed to create backup: $e');
    }
  }

  // Save backup to file
  static Future<File> saveBackupToFile(BackupData backup) async {
    try {
      // Request storage permission
      final status = await Permission.storage.request();
      if (!status.isGranted) {
        throw Exception('Storage permission denied');
      }
      
      // Get directory
      final directory = await getApplicationDocumentsDirectory();
      final backupDir = Directory('${directory.path}/backups');
      if (!await backupDir.exists()) {
        await backupDir.create(recursive: true);
      }
      
      // Create file name
      final timestamp = backup.createdAt.toIso8601String().replaceAll(':', '-');
      final fileName = 'verpa_backup_$timestamp.json';
      final file = File('${backupDir.path}/$fileName');
      
      // Compress and encrypt data
      final jsonData = jsonEncode(backup.toJson());
      final compressed = _compressData(jsonData);
      
      // Write to file
      await file.writeAsBytes(compressed);
      
      // Save to history
      await _saveBackupHistory(
        BackupHistory(
          id: backup.id,
          date: backup.createdAt,
          type: BackupType.manual,
          location: BackupLocation.local,
          fileName: fileName,
          fileSize: compressed.length,
          status: BackupStatus.success,
          metadata: backup.metadata,
        ),
      );
      
      return file;
    } catch (e) {
      throw Exception('Failed to save backup: $e');
    }
  }

  // Export backup
  static Future<void> exportBackup(BackupData backup) async {
    try {
      final file = await saveBackupToFile(backup);
      
      // Share file
      await Share.shareXFiles(
        [XFile(file.path)],
        subject: 'Verpa Backup - ${backup.createdAt}',
        text: 'Backup created on ${backup.createdAt}',
      );
    } catch (e) {
      throw Exception('Failed to export backup: $e');
    }
  }

  // Import backup from file
  static Future<BackupData> importBackupFromFile() async {
    try {
      // Pick file
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['json', 'verpa'],
      );
      
      if (result == null || result.files.isEmpty) {
        throw Exception('No file selected');
      }
      
      final file = File(result.files.first.path!);
      
      // Read and decompress file
      final compressed = await file.readAsBytes();
      final jsonData = _decompressData(compressed);
      
      // Parse backup data
      final backupJson = jsonDecode(jsonData);
      final backup = BackupData.fromJson(backupJson);
      
      return backup;
    } catch (e) {
      throw Exception('Failed to import backup: $e');
    }
  }

  // Restore backup
  static Future<void> restoreBackup(
    BackupData backup,
    RestoreOptions options,
  ) async {
    try {
      // Clear existing data if requested
      if (options.clearExistingData) {
        await _clearAllData();
      }
      
      // Restore each collection
      final collectionsToRestore = options.collectionsToRestore.isEmpty
          ? backup.metadata.includedCollections
          : options.collectionsToRestore;
      
      for (final collection in collectionsToRestore) {
        await _restoreCollection(
          collection,
          backup.data[collection] ?? {},
          options,
        );
      }
      
      // Update last restore date
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('verpa_last_restore_date', DateTime.now().toIso8601String());
      
    } catch (e) {
      throw Exception('Failed to restore backup: $e');
    }
  }

  // Collect all data
  static Future<Map<String, dynamic>> _collectAllData(
    List<String>? specificCollections,
  ) async {
    final data = <String, dynamic>{};
    final collections = specificCollections ?? [
      'aquariums',
      'waterChanges',
      'maintenanceTasks',
      'expenses',
      'budgets',
      'products',
      'diseaseDetections',
      'feedingSchedules',
      'sharedAquariums',
      'settings',
      'notifications',
    ];
    
    // Collect data from each service
    if (collections.contains('aquariums')) {
      data['aquariums'] = await _getAquariumData();
    }
    
    if (collections.contains('waterChanges')) {
      data['waterChanges'] = await _getWaterChangeData();
    }
    
    if (collections.contains('maintenanceTasks')) {
      data['maintenanceTasks'] = await _getMaintenanceData();
    }
    
    if (collections.contains('expenses')) {
      data['expenses'] = await _getExpenseData();
    }
    
    if (collections.contains('budgets')) {
      data['budgets'] = await _getBudgetData();
    }
    
    if (collections.contains('products')) {
      data['products'] = await _getProductData();
    }
    
    if (collections.contains('diseaseDetections')) {
      data['diseaseDetections'] = await _getDiseaseDetectionData();
    }
    
    if (collections.contains('feedingSchedules')) {
      data['feedingSchedules'] = await _getFeedingData();
    }
    
    if (collections.contains('sharedAquariums')) {
      data['sharedAquariums'] = await _getSharedAquariumData();
    }
    
    if (collections.contains('settings')) {
      data['settings'] = await _getSettingsData();
    }
    
    if (collections.contains('notifications')) {
      data['notifications'] = await _getNotificationData();
    }
    
    return data;
  }

  // Get data from services
  static Future<List<Map<String, dynamic>>> _getAquariumData() async {
    final aquariums = await AquariumService.getAquariums();
    return aquariums.map((a) => a.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getWaterChangeData() async {
    final waterChanges = await WaterChangeService.getAllWaterChanges();
    return waterChanges.map((w) => w.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getMaintenanceData() async {
    final tasks = await MaintenanceService.getAllTasks();
    return tasks.map((t) => t.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getExpenseData() async {
    final expenses = await ExpenseService.getAllExpenses();
    return expenses.map((e) => e.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getBudgetData() async {
    // Get all budgets - would need to add this method to ExpenseService
    return [];
  }

  static Future<List<Map<String, dynamic>>> _getProductData() async {
    final products = await BarcodeService.getAllScannedProducts();
    return products.map((p) => p.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getDiseaseDetectionData() async {
    final detections = await DiseaseDetectionService.getAllDetections();
    return detections.map((d) => d.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getFeedingData() async {
    final schedules = await FeedingService.getAllSchedules();
    return schedules.map((s) => s.toJson()).toList();
  }

  static Future<List<Map<String, dynamic>>> _getSharedAquariumData() async {
    final shared = await SocialService.getMySharedAquariums();
    return shared.map((s) => s.toJson()).toList();
  }

  static Future<Map<String, dynamic>> _getSettingsData() async {
    return await SettingsService.getAllSettings();
  }

  static Future<List<Map<String, dynamic>>> _getNotificationData() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('verpa_notifications');
    if (data == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(data));
  }

  // Calculate metadata
  static BackupMetadata _calculateMetadata(Map<String, dynamic> data) {
    int totalSize = 0;
    final jsonStr = jsonEncode(data);
    totalSize = jsonStr.length;
    
    return BackupMetadata(
      aquariumCount: (data['aquariums'] as List?)?.length ?? 0,
      parameterRecordCount: _countParameterRecords(data['aquariums'] as List?),
      equipmentCount: _countEquipment(data['aquariums'] as List?),
      inhabitantCount: _countInhabitants(data['aquariums'] as List?),
      waterChangeCount: (data['waterChanges'] as List?)?.length ?? 0,
      maintenanceTaskCount: (data['maintenanceTasks'] as List?)?.length ?? 0,
      expenseCount: (data['expenses'] as List?)?.length ?? 0,
      productCount: (data['products'] as List?)?.length ?? 0,
      diseaseDetectionCount: (data['diseaseDetections'] as List?)?.length ?? 0,
      feedingScheduleCount: (data['feedingSchedules'] as List?)?.length ?? 0,
      sharedAquariumCount: (data['sharedAquariums'] as List?)?.length ?? 0,
      totalDataSize: totalSize,
      includedCollections: data.keys.toList(),
    );
  }

  static int _countParameterRecords(List? aquariums) {
    if (aquariums == null) return 0;
    int count = 0;
    for (final aquarium in aquariums) {
      count += (aquarium['parameterHistory'] as List?)?.length ?? 0;
    }
    return count;
  }

  static int _countEquipment(List? aquariums) {
    if (aquariums == null) return 0;
    int count = 0;
    for (final aquarium in aquariums) {
      count += (aquarium['equipment'] as List?)?.length ?? 0;
    }
    return count;
  }

  static int _countInhabitants(List? aquariums) {
    if (aquariums == null) return 0;
    int count = 0;
    for (final aquarium in aquariums) {
      count += (aquarium['inhabitants'] as List?)?.length ?? 0;
    }
    return count;
  }

  // Clear all data
  static Future<void> _clearAllData() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((key) => key.startsWith('verpa_')).toList();
    
    for (final key in keys) {
      // Don't clear auth or backup history
      if (!key.contains('auth') && !key.contains('backup_history')) {
        await prefs.remove(key);
      }
    }
  }

  // Restore collection
  static Future<void> _restoreCollection(
    String collection,
    dynamic data,
    RestoreOptions options,
  ) async {
    // Implementation would depend on each service having restore methods
    // For now, this is a placeholder
    switch (collection) {
      case 'aquariums':
        // Would need AquariumService.restoreAquariums(data, options)
        break;
      case 'waterChanges':
        // Would need WaterChangeService.restoreWaterChanges(data, options)
        break;
      // ... other collections
    }
  }

  // Compress data
  static List<int> _compressData(String data) {
    final bytes = utf8.encode(data);
    final archive = Archive();
    archive.addFile(ArchiveFile('backup.json', bytes.length, bytes));
    return ZipEncoder().encode(archive)!;
  }

  // Decompress data
  static String _decompressData(List<int> compressed) {
    final archive = ZipDecoder().decodeBytes(compressed);
    final file = archive.first;
    return utf8.decode(file.content as List<int>);
  }

  // Get device info
  static Future<String> _getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    
    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return 'Android ${androidInfo.version.release} (${androidInfo.model})';
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return 'iOS ${iosInfo.systemVersion} (${iosInfo.model})';
    }
    
    return 'Unknown Device';
  }

  // Save backup history
  static Future<void> _saveBackupHistory(BackupHistory history) async {
    final prefs = await SharedPreferences.getInstance();
    final historyData = prefs.getString(_backupHistoryKey);
    
    final List<dynamic> histories = historyData != null
        ? jsonDecode(historyData)
        : [];
    
    histories.insert(0, history.toJson());
    
    // Keep only last 20 backups in history
    if (histories.length > 20) {
      histories.removeRange(20, histories.length);
    }
    
    await prefs.setString(_backupHistoryKey, jsonEncode(histories));
  }

  // Get backup history
  static Future<List<BackupHistory>> getBackupHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_backupHistoryKey);
    
    if (data == null) return [];
    
    final List<dynamic> histories = jsonDecode(data);
    
    return histories
        .map((json) => BackupHistory.fromJson(json))
        .toList();
  }

  // Enable auto backup
  static Future<void> enableAutoBackup({
    BackupLocation location = BackupLocation.local,
    Duration interval = const Duration(days: 7),
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_autoBackupKey, true);
    await prefs.setString(_backupLocationKey, location.name);
    
    // Schedule periodic backup - would use background_fetch or workmanager
  }

  // Disable auto backup
  static Future<void> disableAutoBackup() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_autoBackupKey, false);
    
    // Cancel scheduled backups
  }

  // Check if auto backup is enabled
  static Future<bool> isAutoBackupEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_autoBackupKey) ?? false;
  }

  // Get last backup date
  static Future<DateTime?> getLastBackupDate() async {
    final prefs = await SharedPreferences.getInstance();
    final dateStr = prefs.getString(_lastBackupKey);
    return dateStr != null ? DateTime.parse(dateStr) : null;
  }

  // Clean old backups
  static Future<void> cleanOldBackups({int keepCount = 10}) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final backupDir = Directory('${directory.path}/backups');
      
      if (!await backupDir.exists()) return;
      
      final files = await backupDir.list().toList();
      final backupFiles = files
          .whereType<File>()
          .where((f) => f.path.contains('verpa_backup_'))
          .toList();
      
      // Sort by modification date
      backupFiles.sort((a, b) => 
          b.statSync().modified.compareTo(a.statSync().modified));
      
      // Delete old files
      if (backupFiles.length > keepCount) {
        for (int i = keepCount; i < backupFiles.length; i++) {
          await backupFiles[i].delete();
        }
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}