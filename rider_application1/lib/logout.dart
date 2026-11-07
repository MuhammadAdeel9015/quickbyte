import 'dart:async';
import 'package:flutter/material.dart';
import 'cafe_theme.dart';
import 'login.dart';
import 'rider_api_service.dart';

class PageNew9 extends StatefulWidget {
  const PageNew9({super.key, required this.apiService});

  final RiderApiService apiService;

  @override
  State<PageNew9> createState() => _PageNew9State();
}

class _PageNew9State extends State<PageNew9> {
  Timer? _timer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _logout();
  }

  Future<void> _logout() async {
    try {
      await widget.apiService.logout();
    } on RiderApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      _timer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (context) => LoginPage(apiService: widget.apiService),
          ),
          (route) => false,
        );
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: creamBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Logout', style: TextStyle(color: Colors.white)),
        backgroundColor: primaryOrange,
      ),
      body: Center(
        child: _error == null
            ? const Text(
                'Logout',
                style: TextStyle(
                  fontSize: 30,
                  color: primaryOrange,
                  fontWeight: FontWeight.bold,
                ),
              )
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Your session was cleared. Sign-out notification failed: $_error',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
      ),
    );
  }
}
