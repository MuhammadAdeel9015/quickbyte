// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:login_application1/main.dart';
import 'package:login_application1/rider_api_service.dart';

class _MemoryTokenStore implements SessionTokenStore {
  String? token;

  @override
  Future<String?> readToken() async => token;

  @override
  Future<void> writeToken(String value) async => token = value;

  @override
  Future<void> clearToken() async => token = null;
}

void main() {
  testWidgets('splash opens the rider login screen', (
    WidgetTester tester,
  ) async {
    final service = RiderApiService(
      tokenStore: _MemoryTokenStore(),
      client: MockClient((_) async => http.Response('', 500)),
    );
    await tester.pumpWidget(MyApp(apiService: service));

    await tester.pumpAndSettle();
    expect(find.text('Rider Login'), findsOneWidget);
    expect(find.text('LOGIN'), findsOneWidget);
  });

  testWidgets('invalid backend credentials keep the user on login', (
    WidgetTester tester,
  ) async {
    final store = _MemoryTokenStore();
    final service = RiderApiService(
      baseUrl: 'https://api.test/api',
      tokenStore: store,
      client: MockClient(
        (_) async => http.Response(
          '{"error":{"code":"INVALID_CREDENTIALS","message":"Email or password is incorrect."}}',
          401,
        ),
      ),
    );
    await tester.pumpWidget(MyApp(apiService: service));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'rider@example.com');
    await tester.enterText(find.byType(TextField).last, 'wrong-password');
    await tester.tap(find.text('LOGIN'));
    await tester.pumpAndSettle();

    expect(find.text('Rider Login'), findsOneWidget);
    expect(find.text('Email or password is incorrect.'), findsOneWidget);
    expect(store.token, isNull);
  });
}
