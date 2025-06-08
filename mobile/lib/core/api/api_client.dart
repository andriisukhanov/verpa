import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:logger/logger.dart';

class ApiClient {
  static const String _baseUrl = 'http://localhost:3000/api/v1';
  static const String _apiKeyHeader = 'X-API-Key';
  static const String _authHeader = 'Authorization';
  
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final Logger _logger = Logger();

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: dotenv.get('API_BASE_URL', fallback: _baseUrl),
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        _apiKeyHeader: dotenv.get('API_KEY', fallback: 'verpa_mobile_api_key'),
      },
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    // Request interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add auth token if available
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers[_authHeader] = 'Bearer $token';
        }
        
        _logger.d('API Request: ${options.method} ${options.path}');
        handler.next(options);
      },
      
      onResponse: (response, handler) {
        _logger.d('API Response: ${response.statusCode} ${response.requestOptions.path}');
        handler.next(response);
      },
      
      onError: (error, handler) async {
        _logger.e('API Error: ${error.response?.statusCode} ${error.requestOptions.path}');
        
        // Handle 401 Unauthorized - token expired
        if (error.response?.statusCode == 401) {
          await _handleTokenExpired();
        }
        
        handler.next(error);
      },
    ));
  }

  Future<void> _handleTokenExpired() async {
    // Try to refresh token
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken != null) {
        final response = await _dio.post('/auth/refresh', data: {
          'refreshToken': refreshToken,
        });
        
        if (response.statusCode == 200) {
          final data = response.data;
          await _storage.write(key: 'access_token', value: data['accessToken']);
          await _storage.write(key: 'refresh_token', value: data['refreshToken']);
          return;
        }
      }
    } catch (e) {
      _logger.e('Failed to refresh token: $e');
    }
    
    // If refresh fails, clear tokens and redirect to login
    await clearTokens();
  }

  Future<void> setTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  // Auth endpoints
  Future<Response> login(String emailOrUsername, String password) {
    return _dio.post('/auth/login', data: {
      'emailOrUsername': emailOrUsername,
      'password': password,
    });
  }

  Future<Response> register({
    required String email,
    required String username,
    required String password,
    required String firstName,
    required String lastName,
  }) {
    return _dio.post('/auth/register', data: {
      'email': email,
      'username': username,
      'password': password,
      'firstName': firstName,
      'lastName': lastName,
    });
  }

  Future<Response> forgotPassword(String email) {
    return _dio.post('/auth/forgot-password', data: {
      'email': email,
    });
  }

  Future<Response> resetPassword(String token, String newPassword) {
    return _dio.post('/auth/reset-password', data: {
      'token': token,
      'newPassword': newPassword,
    });
  }

  Future<Response> verifyEmail(String token) {
    return _dio.post('/auth/verify-email', data: {
      'token': token,
    });
  }

  Future<Response> resendVerification(String email) {
    return _dio.post('/auth/resend-verification', data: {
      'email': email,
    });
  }

  Future<Response> getCurrentUser() {
    return _dio.get('/auth/me');
  }

  // Aquarium endpoints
  Future<Response> getAquariums() {
    return _dio.get('/aquariums');
  }

  Future<Response> getAquarium(String id) {
    return _dio.get('/aquariums/$id');
  }

  Future<Response> createAquarium(Map<String, dynamic> aquariumData) {
    return _dio.post('/aquariums', data: aquariumData);
  }

  Future<Response> updateAquarium(String id, Map<String, dynamic> aquariumData) {
    return _dio.put('/aquariums/$id', data: aquariumData);
  }

  Future<Response> deleteAquarium(String id) {
    return _dio.delete('/aquariums/$id');
  }

  Future<Response> recordWaterParameters(String aquariumId, Map<String, dynamic> parameters) {
    return _dio.post('/aquariums/$aquariumId/water-parameters', data: parameters);
  }

  Future<Response> getWaterParametersHistory(String aquariumId, {
    DateTime? startDate,
    DateTime? endDate,
  }) {
    final params = <String, dynamic>{};
    if (startDate != null) params['startDate'] = startDate.toIso8601String();
    if (endDate != null) params['endDate'] = endDate.toIso8601String();
    
    return _dio.get('/aquariums/$aquariumId/water-parameters', queryParameters: params);
  }

  // Events endpoints
  Future<Response> getEvents() {
    return _dio.get('/events');
  }

  Future<Response> createEvent(Map<String, dynamic> eventData) {
    return _dio.post('/events', data: eventData);
  }

  Future<Response> updateEvent(String id, Map<String, dynamic> eventData) {
    return _dio.put('/events/$id', data: eventData);
  }

  Future<Response> deleteEvent(String id) {
    return _dio.delete('/events/$id');
  }

  // Media endpoints
  Future<Response> uploadFile(String filePath, {String? aquariumId}) {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromFileSync(filePath),
      if (aquariumId != null) 'aquariumId': aquariumId,
    });
    
    return _dio.post('/media/upload', data: formData);
  }

  Future<Response> getFiles({String? aquariumId}) {
    final params = <String, dynamic>{};
    if (aquariumId != null) params['aquariumId'] = aquariumId;
    
    return _dio.get('/media/files', queryParameters: params);
  }

  Future<Response> deleteFile(String fileId) {
    return _dio.delete('/media/files/$fileId');
  }
}