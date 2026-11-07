import 'package:flutter/material.dart';

import 'cafe_theme.dart';
import 'login.dart';
import 'rider_api_service.dart';
import 'rider_dashboard.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  MyApp({super.key, RiderApiService? apiService})
    : apiService = apiService ?? riderApiService;

  final RiderApiService apiService;

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'QuickBite Rider',
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryOrange,
        surface: creamBackground,
      ),
      scaffoldBackgroundColor: creamBackground,
    ),
    home: SplashScreen(apiService: apiService),
  );
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.apiService});

  final RiderApiService apiService;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final rider = await widget.apiService.restoreSession();
      if (!mounted) return;
      if (rider == null) {
        _showLogin();
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => RiderDashboard(
              apiService: widget.apiService,
              riderName: rider.name,
              riderEmail: rider.email,
              riderPhone: rider.phone,
              riderAvailability: rider.availability,
            ),
          ),
        );
      }
    } on RiderApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showLogin() => Navigator.pushReplacement(
    context,
    MaterialPageRoute(builder: (_) => LoginPage(apiService: widget.apiService)),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: darkBackground,
    body: Center(
      child: _isLoading
          ? const CircularProgressIndicator(color: primaryOrange)
          : _error != null
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_off_outlined,
                    color: primaryOrange,
                    size: 56,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _restoreSession,
                    child: const Text('Retry'),
                  ),
                  TextButton(
                    onPressed: _showLogin,
                    child: const Text('Go to login'),
                  ),
                ],
              ),
            )
          : const Icon(Icons.delivery_dining, color: primaryOrange, size: 120),
    ),
  );
}
