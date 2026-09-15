# UrbanStep Mobile

Flutter mobile foundation for the UrbanStep marketplace. It uses BLoC/Cubit, Dio, secure token storage, dependency injection, and a feature-first clean architecture.

Run:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=https://your-backend.example.com/api
```

The mobile client is intentionally connected to the existing REST API; it does not create a second backend.
