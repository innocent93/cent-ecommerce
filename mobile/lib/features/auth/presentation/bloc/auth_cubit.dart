import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/auth_repository.dart';

sealed class AuthState extends Equatable { const AuthState(); @override List<Object?> get props => []; }
final class AuthInitial extends AuthState {}
final class AuthLoading extends AuthState {}
final class AuthAuthenticated extends AuthState {}
final class AuthUnauthenticated extends AuthState {}
final class AuthFailure extends AuthState { const AuthFailure(this.message); final String message; @override List<Object?> get props => [message]; }

class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this.repository) : super(AuthInitial());
  final AuthRepository repository;
  Future<void> login(String email, String password) async {
    emit(AuthLoading());
    try { await repository.login(email: email, password: password); emit(AuthAuthenticated()); } catch (e) { emit(AuthFailure(e.toString())); }
  }
  Future<void> logout() async { await repository.logout(); emit(AuthUnauthenticated()); }
}
