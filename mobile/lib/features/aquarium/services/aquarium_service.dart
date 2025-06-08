import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../../core/api/api_client.dart';
import '../../../core/storage/storage_service.dart';
import '../models/aquarium_model.dart';

class AquariumService {
  final ApiClient apiClient;
  final StorageService storageService;
  final Logger _logger = Logger();

  AquariumService({
    required this.apiClient,
    required this.storageService,
  });

  // Get all aquariums for the current user
  Future<List<Aquarium>> getMyAquariums() async {
    try {
      final response = await apiClient.get('/aquariums/my-aquariums');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['aquariums'] ?? [];
        final aquariums = data.map((json) => Aquarium.fromJson(json)).toList();
        
        // Cache aquariums locally
        await _cacheAquariums(aquariums);
        
        return aquariums;
      } else {
        throw Exception('Failed to fetch aquariums');
      }
    } on DioException catch (e) {
      _logger.e('Failed to fetch aquariums: $e');
      
      // Try to return cached data if network fails
      final cachedData = await storageService.getCachedData('my_aquariums');
      if (cachedData != null) {
        final List<dynamic> data = cachedData['aquariums'] ?? [];
        return data.map((json) => Aquarium.fromJson(json)).toList();
      }
      
      throw _handleError(e);
    } catch (e) {
      _logger.e('Unexpected error fetching aquariums: $e');
      throw Exception('Failed to fetch aquariums');
    }
  }

  // Get a single aquarium by ID
  Future<Aquarium> getAquarium(String id) async {
    try {
      // Try cache first
      final cachedData = await storageService.getCachedData('aquarium_$id');
      if (cachedData != null) {
        return Aquarium.fromJson(cachedData);
      }

      final response = await apiClient.get('/aquariums/$id');
      
      if (response.statusCode == 200) {
        final aquarium = Aquarium.fromJson(response.data['aquarium']);
        
        // Cache individual aquarium
        await storageService.cacheData(
          'aquarium_$id',
          aquarium.toJson(),
          ttl: const Duration(hours: 1),
        );
        
        return aquarium;
      } else {
        throw Exception('Failed to fetch aquarium');
      }
    } on DioException catch (e) {
      _logger.e('Failed to fetch aquarium $id: $e');
      throw _handleError(e);
    }
  }

  // Create a new aquarium
  Future<Aquarium> createAquarium({
    required String name,
    required AquariumType type,
    required double volume,
    required String volumeUnit,
    required AquariumDimensions dimensions,
    required WaterType waterType,
    String? description,
    String? location,
    String? imageUrl,
  }) async {
    try {
      final response = await apiClient.post('/aquariums', data: {
        'name': name,
        'type': type.value,
        'volume': volume,
        'volumeUnit': volumeUnit,
        'dimensions': dimensions.toJson(),
        'waterType': waterType.value,
        'description': description,
        'location': location,
        'imageUrl': imageUrl,
      });
      
      if (response.statusCode == 201) {
        final aquarium = Aquarium.fromJson(response.data['aquarium']);
        
        // Invalidate cache to force refresh
        await storageService.clearCache();
        
        return aquarium;
      } else {
        throw Exception('Failed to create aquarium');
      }
    } on DioException catch (e) {
      _logger.e('Failed to create aquarium: $e');
      throw _handleError(e);
    }
  }

  // Update an aquarium
  Future<Aquarium> updateAquarium(String id, Map<String, dynamic> updates) async {
    try {
      final response = await apiClient.put('/aquariums/$id', data: updates);
      
      if (response.statusCode == 200) {
        final aquarium = Aquarium.fromJson(response.data['aquarium']);
        
        // Update cache
        await storageService.cacheData(
          'aquarium_$id',
          aquarium.toJson(),
          ttl: const Duration(hours: 1),
        );
        
        // Invalidate list cache
        await storageService.clearCache();
        
        return aquarium;
      } else {
        throw Exception('Failed to update aquarium');
      }
    } on DioException catch (e) {
      _logger.e('Failed to update aquarium $id: $e');
      throw _handleError(e);
    }
  }

  // Delete an aquarium
  Future<void> deleteAquarium(String id) async {
    try {
      final response = await apiClient.delete('/aquariums/$id');
      
      if (response.statusCode == 200 || response.statusCode == 204) {
        // Clear all caches
        await storageService.clearCache();
      } else {
        throw Exception('Failed to delete aquarium');
      }
    } on DioException catch (e) {
      _logger.e('Failed to delete aquarium $id: $e');
      throw _handleError(e);
    }
  }

  // Add equipment to aquarium
  Future<Aquarium> addEquipment(String aquariumId, Equipment equipment) async {
    try {
      final response = await apiClient.post(
        '/aquariums/$aquariumId/equipment',
        data: equipment.toJson(),
      );
      
      if (response.statusCode == 200) {
        final aquarium = Aquarium.fromJson(response.data['aquarium']);
        
        // Update cache
        await storageService.cacheData(
          'aquarium_$aquariumId',
          aquarium.toJson(),
          ttl: const Duration(hours: 1),
        );
        
        return aquarium;
      } else {
        throw Exception('Failed to add equipment');
      }
    } on DioException catch (e) {
      _logger.e('Failed to add equipment to aquarium $aquariumId: $e');
      throw _handleError(e);
    }
  }

  // Add inhabitant to aquarium
  Future<Aquarium> addInhabitant(String aquariumId, Inhabitant inhabitant) async {
    try {
      final response = await apiClient.post(
        '/aquariums/$aquariumId/inhabitants',
        data: inhabitant.toJson(),
      );
      
      if (response.statusCode == 200) {
        final aquarium = Aquarium.fromJson(response.data['aquarium']);
        
        // Update cache
        await storageService.cacheData(
          'aquarium_$aquariumId',
          aquarium.toJson(),
          ttl: const Duration(hours: 1),
        );
        
        return aquarium;
      } else {
        throw Exception('Failed to add inhabitant');
      }
    } on DioException catch (e) {
      _logger.e('Failed to add inhabitant to aquarium $aquariumId: $e');
      throw _handleError(e);
    }
  }

  // Record water parameters
  Future<WaterParameters> recordParameters(String aquariumId, WaterParameters parameters) async {
    try {
      final response = await apiClient.post(
        '/aquariums/$aquariumId/parameters',
        data: parameters.toJson(),
      );
      
      if (response.statusCode == 201) {
        final params = WaterParameters.fromJson(response.data['parameters']);
        
        // Invalidate aquarium cache to get updated health score
        await storageService.clearCache();
        
        return params;
      } else {
        throw Exception('Failed to record parameters');
      }
    } on DioException catch (e) {
      _logger.e('Failed to record parameters for aquarium $aquariumId: $e');
      throw _handleError(e);
    }
  }

  // Get parameter history
  Future<List<WaterParameters>> getParameterHistory(
    String aquariumId, {
    DateTime? startDate,
    DateTime? endDate,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit,
      };
      
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }
      
      final response = await apiClient.get(
        '/aquariums/$aquariumId/parameters',
        queryParameters: queryParams,
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['parameters'] ?? [];
        return data.map((json) => WaterParameters.fromJson(json)).toList();
      } else {
        throw Exception('Failed to fetch parameter history');
      }
    } on DioException catch (e) {
      _logger.e('Failed to fetch parameter history for aquarium $aquariumId: $e');
      throw _handleError(e);
    }
  }

  // Upload image file
  Future<String> uploadImage(dynamic file) async {
    String filePath;
    if (file is String) {
      filePath = file;
    } else if (file.path != null) {
      filePath = file.path;
    } else {
      throw Exception('Invalid file type');
    }
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          filePath,
          filename: filePath.split('/').last,
        ),
      });
      
      final response = await apiClient.post(
        '/media/upload',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );
      
      if (response.statusCode == 200) {
        return response.data['url'];
      } else {
        throw Exception('Failed to upload image');
      }
    } on DioException catch (e) {
      _logger.e('Failed to upload image: $e');
      throw _handleError(e);
    }
  }

  // Private helper methods
  Future<void> _cacheAquariums(List<Aquarium> aquariums) async {
    await storageService.cacheData(
      'my_aquariums',
      {
        'aquariums': aquariums.map((a) => a.toJson()).toList(),
        'timestamp': DateTime.now().toIso8601String(),
      },
      ttl: const Duration(hours: 1),
    );
  }

  Exception _handleError(DioException error) {
    if (error.response?.data != null && error.response?.data['message'] != null) {
      return Exception(error.response!.data['message']);
    }
    
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Connection timeout. Please check your internet connection.');
      case DioExceptionType.badResponse:
        switch (error.response?.statusCode) {
          case 400:
            return Exception('Invalid request. Please check your input.');
          case 401:
            return Exception('Unauthorized. Please login again.');
          case 403:
            return Exception('Access denied.');
          case 404:
            return Exception('Aquarium not found.');
          case 409:
            return Exception('Aquarium with this name already exists.');
          case 500:
            return Exception('Server error. Please try again later.');
          default:
            return Exception('An error occurred. Please try again.');
        }
      default:
        return Exception('Network error. Please check your connection.');
    }
  }
}