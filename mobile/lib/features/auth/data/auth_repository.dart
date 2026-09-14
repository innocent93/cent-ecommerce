import 'package:dio/dio.dart';
import '../../../core/storage/token_storage.dart';

class AuthRepository {
  AuthRepository(this.dio, this.tokens);
  final Dio dio;
  final TokenStorage tokens;

  Future<void> login({required String email, required String password}) async {
    final response = await dio.post('/user/login', data: {'email': email, 'password': password});
    final token = response.data['accessToken'] ?? response.data['token'];
    if (token is! String || token.isEmpty) throw StateError('Login response did not contain an access token');
    await tokens.saveAccessToken(token);
  }

  Future<void> logout() async {
    try { await dio.post('/user/logout'); } finally { await tokens.clear(); }
  }
}
