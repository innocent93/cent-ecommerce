import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  const TokenStorage(this.storage);
  final FlutterSecureStorage storage;
  Future<void> saveAccessToken(String token) => storage.write(key: 'access_token', value: token);
  Future<String?> readAccessToken() => storage.read(key: 'access_token');
  Future<void> clear() => storage.deleteAll();
}
