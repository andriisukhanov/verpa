import 'package:equatable/equatable.dart';

class BackupData extends Equatable {
  final String id;
  final DateTime createdAt;
  final String appVersion;
  final String deviceInfo;
  final Map<String, dynamic> data;
  final BackupMetadata metadata;

  const BackupData({
    required this.id,
    required this.createdAt,
    required this.appVersion,
    required this.deviceInfo,
    required this.data,
    required this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'createdAt': createdAt.toIso8601String(),
      'appVersion': appVersion,
      'deviceInfo': deviceInfo,
      'data': data,
      'metadata': metadata.toJson(),
    };
  }

  factory BackupData.fromJson(Map<String, dynamic> json) {
    return BackupData(
      id: json['id'],
      createdAt: DateTime.parse(json['createdAt']),
      appVersion: json['appVersion'],
      deviceInfo: json['deviceInfo'],
      data: Map<String, dynamic>.from(json['data']),
      metadata: BackupMetadata.fromJson(json['metadata']),
    );
  }

  @override
  List<Object> get props => [
        id,
        createdAt,
        appVersion,
        deviceInfo,
        data,
        metadata,
      ];
}

class BackupMetadata extends Equatable {
  final int aquariumCount;
  final int parameterRecordCount;
  final int equipmentCount;
  final int inhabitantCount;
  final int waterChangeCount;
  final int maintenanceTaskCount;
  final int expenseCount;
  final int productCount;
  final int diseaseDetectionCount;
  final int feedingScheduleCount;
  final int sharedAquariumCount;
  final int totalDataSize;
  final List<String> includedCollections;

  const BackupMetadata({
    required this.aquariumCount,
    required this.parameterRecordCount,
    required this.equipmentCount,
    required this.inhabitantCount,
    required this.waterChangeCount,
    required this.maintenanceTaskCount,
    required this.expenseCount,
    required this.productCount,
    required this.diseaseDetectionCount,
    required this.feedingScheduleCount,
    required this.sharedAquariumCount,
    required this.totalDataSize,
    required this.includedCollections,
  });

  Map<String, dynamic> toJson() {
    return {
      'aquariumCount': aquariumCount,
      'parameterRecordCount': parameterRecordCount,
      'equipmentCount': equipmentCount,
      'inhabitantCount': inhabitantCount,
      'waterChangeCount': waterChangeCount,
      'maintenanceTaskCount': maintenanceTaskCount,
      'expenseCount': expenseCount,
      'productCount': productCount,
      'diseaseDetectionCount': diseaseDetectionCount,
      'feedingScheduleCount': feedingScheduleCount,
      'sharedAquariumCount': sharedAquariumCount,
      'totalDataSize': totalDataSize,
      'includedCollections': includedCollections,
    };
  }

  factory BackupMetadata.fromJson(Map<String, dynamic> json) {
    return BackupMetadata(
      aquariumCount: json['aquariumCount'] ?? 0,
      parameterRecordCount: json['parameterRecordCount'] ?? 0,
      equipmentCount: json['equipmentCount'] ?? 0,
      inhabitantCount: json['inhabitantCount'] ?? 0,
      waterChangeCount: json['waterChangeCount'] ?? 0,
      maintenanceTaskCount: json['maintenanceTaskCount'] ?? 0,
      expenseCount: json['expenseCount'] ?? 0,
      productCount: json['productCount'] ?? 0,
      diseaseDetectionCount: json['diseaseDetectionCount'] ?? 0,
      feedingScheduleCount: json['feedingScheduleCount'] ?? 0,
      sharedAquariumCount: json['sharedAquariumCount'] ?? 0,
      totalDataSize: json['totalDataSize'] ?? 0,
      includedCollections: List<String>.from(json['includedCollections'] ?? []),
    );
  }

  @override
  List<Object> get props => [
        aquariumCount,
        parameterRecordCount,
        equipmentCount,
        inhabitantCount,
        waterChangeCount,
        maintenanceTaskCount,
        expenseCount,
        productCount,
        diseaseDetectionCount,
        feedingScheduleCount,
        sharedAquariumCount,
        totalDataSize,
        includedCollections,
      ];
}

class BackupHistory extends Equatable {
  final String id;
  final DateTime date;
  final BackupType type;
  final BackupLocation location;
  final String? fileName;
  final int fileSize;
  final BackupStatus status;
  final String? errorMessage;
  final BackupMetadata metadata;

  const BackupHistory({
    required this.id,
    required this.date,
    required this.type,
    required this.location,
    this.fileName,
    required this.fileSize,
    required this.status,
    this.errorMessage,
    required this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'type': type.name,
      'location': location.name,
      'fileName': fileName,
      'fileSize': fileSize,
      'status': status.name,
      'errorMessage': errorMessage,
      'metadata': metadata.toJson(),
    };
  }

  factory BackupHistory.fromJson(Map<String, dynamic> json) {
    return BackupHistory(
      id: json['id'],
      date: DateTime.parse(json['date']),
      type: BackupType.values.firstWhere((t) => t.name == json['type']),
      location: BackupLocation.values.firstWhere((l) => l.name == json['location']),
      fileName: json['fileName'],
      fileSize: json['fileSize'] ?? 0,
      status: BackupStatus.values.firstWhere((s) => s.name == json['status']),
      errorMessage: json['errorMessage'],
      metadata: BackupMetadata.fromJson(json['metadata']),
    );
  }

  @override
  List<Object?> get props => [
        id,
        date,
        type,
        location,
        fileName,
        fileSize,
        status,
        errorMessage,
        metadata,
      ];
}

enum BackupType {
  manual('manual', 'Manual Backup'),
  automatic('automatic', 'Automatic Backup'),
  beforeUpdate('before_update', 'Pre-Update Backup');

  final String name;
  final String displayName;

  const BackupType(this.name, this.displayName);
}

enum BackupLocation {
  local('local', 'Device Storage'),
  googleDrive('google_drive', 'Google Drive'),
  icloud('icloud', 'iCloud'),
  dropbox('dropbox', 'Dropbox');

  final String name;
  final String displayName;

  const BackupLocation(this.name, this.displayName);
}

enum BackupStatus {
  success('success', 'Successful'),
  failed('failed', 'Failed'),
  inProgress('in_progress', 'In Progress'),
  cancelled('cancelled', 'Cancelled');

  final String name;
  final String displayName;

  const BackupStatus(this.name, this.displayName);
}

class RestoreOptions extends Equatable {
  final bool clearExistingData;
  final bool mergeData;
  final List<String> collectionsToRestore;
  final bool skipDuplicates;
  final ConflictResolution conflictResolution;

  const RestoreOptions({
    this.clearExistingData = false,
    this.mergeData = true,
    this.collectionsToRestore = const [],
    this.skipDuplicates = true,
    this.conflictResolution = ConflictResolution.keepNewer,
  });

  Map<String, dynamic> toJson() {
    return {
      'clearExistingData': clearExistingData,
      'mergeData': mergeData,
      'collectionsToRestore': collectionsToRestore,
      'skipDuplicates': skipDuplicates,
      'conflictResolution': conflictResolution.name,
    };
  }

  @override
  List<Object> get props => [
        clearExistingData,
        mergeData,
        collectionsToRestore,
        skipDuplicates,
        conflictResolution,
      ];
}

enum ConflictResolution {
  keepNewer('keep_newer', 'Keep Newer Data'),
  keepOlder('keep_older', 'Keep Older Data'),
  keepBoth('keep_both', 'Keep Both'),
  askUser('ask_user', 'Ask Each Time');

  final String name;
  final String displayName;

  const ConflictResolution(this.name, this.displayName);
}