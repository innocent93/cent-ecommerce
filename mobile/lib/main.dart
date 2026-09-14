import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'core/storage/token_storage.dart';
import 'core/network/api_client.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/bloc/auth_cubit.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

void main() {
  const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000/api');
  final client = ApiClient(baseUrl);
  final tokens = const TokenStorage(FlutterSecureStorage());
  runApp(BlocProvider(create: (_) => AuthCubit(AuthRepository(client.dio, tokens)), child: const UrbanStepApp()));
}

class UrbanStepApp extends StatelessWidget {
  const UrbanStepApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(title: 'UrbanStep', theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true), home: const Scaffold(body: Center(child: Text('UrbanStep Mobile'))));
}
