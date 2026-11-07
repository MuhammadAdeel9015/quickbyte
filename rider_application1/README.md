# QuickBite Rider

Flutter application for QuickBite delivery riders.

## API configuration

The app connects to the existing QuickBite backend. The default local API URL
is `http://10.0.2.2:4000/api` on the Android emulator and
`http://127.0.0.1:4000/api` on web and desktop. Override it at run time for a
physical device or deployed API, for example:

```powershell
flutter run --dart-define=QUICKBITE_API_BASE_URL=https://api.example.com/api
```

Rider access tokens are stored with `flutter_secure_storage`; startup validates
the saved token against `/auth/me`. The backend does not provide public rider
registration; rider accounts must be created by an administrator.

## Development

Run `flutter analyze` and `flutter test` from this directory.
