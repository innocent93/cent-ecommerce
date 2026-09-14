import 'package:dio/dio.dart';

class ApiClient {
  ApiClient(String baseUrl) : dio = Dio(BaseOptions(baseUrl: baseUrl, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 20), headers: {'Accept': 'application/json'}));
  final Dio dio;
}
