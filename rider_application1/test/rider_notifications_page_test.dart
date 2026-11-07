import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:login_application1/rider_api_service.dart';
import 'package:login_application1/rider_notifications_page.dart';

class _MemoryTokenStore implements SessionTokenStore {
  @override
  Future<String?> readToken() async => 'saved.jwt';

  @override
  Future<void> writeToken(String token) async {}

  @override
  Future<void> clearToken() async {}
}

void main() {
  const baseUrl = 'https://api.test/api';

  testWidgets('shows loading and empty notification states', (tester) async {
    final response = Completer<http.Response>();
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: _MemoryTokenStore(),
      client: MockClient((_) => response.future),
    );

    await tester.pumpWidget(
      MaterialApp(home: RiderNotificationsPage(apiService: service)),
    );
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    response.complete(http.Response(jsonEncode({'data': []}), 200));
    await tester.pumpAndSettle();

    expect(find.text('No notifications yet.'), findsOneWidget);
  });

  testWidgets('shows API errors and retries without marking notifications read', (
    tester,
  ) async {
    var attempts = 0;
    final methods = <String>[];
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: _MemoryTokenStore(),
      client: MockClient((request) async {
        attempts++;
        methods.add(request.method);
        if (attempts == 1) {
          return http.Response(
            '{"error":{"code":"INTERNAL_ERROR","message":"Notifications unavailable."}}',
            503,
          );
        }
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'NTF-001',
                'title': 'Service update',
                'message': 'A test notification.',
                'read': false,
                'createdAt': '2026-01-02T03:04:05.000Z',
              },
            ],
          }),
          200,
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(home: RiderNotificationsPage(apiService: service)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Notifications unavailable.'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('Service update'), findsOneWidget);
    expect(find.text('A test notification.'), findsOneWidget);
    expect(find.textContaining('2026-01-02'), findsOneWidget);
    expect(methods, ['GET', 'GET']);
  });
}
