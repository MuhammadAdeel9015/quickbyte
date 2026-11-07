import 'package:flutter/material.dart';

import 'cafe_theme.dart';

class SignupPage extends StatelessWidget {
  const SignupPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: creamBackground,
    appBar: AppBar(
      title: const Text('Rider Signup'),
      backgroundColor: primaryOrange,
      foregroundColor: Colors.white,
    ),
    body: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.info_outline, color: primaryOrange, size: 56),
          const SizedBox(height: 16),
          const Text(
            'Rider accounts are created by QuickBite administrators. '
            'Self-service rider registration is not available.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 17),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryOrange,
              foregroundColor: Colors.white,
            ),
            child: const Text('Back to login'),
          ),
        ],
      ),
    ),
  );
}
