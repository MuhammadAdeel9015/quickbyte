import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:login_application1/rider_api_service.dart';

class MemoryTokenStore implements SessionTokenStore {
  String? token;

  @override
  Future<String?> readToken() async => token;

  @override
  Future<void> writeToken(String value) async => token = value;

  @override
  Future<void> clearToken() async => token = null;
}

Map<String, dynamic> rider({
  String id = 'RID-208',
  String availability = 'Available',
}) => {
  'id': id,
  'role': 'rider',
  'name': 'Daniel Brooks',
  'email': 'daniel.brooks@quickbite.test',
  'phone': '+1 (415) 555-0141',
  'availability': availability,
};

Map<String, dynamic> order({
  String id = 'QB-3001',
  String status = 'Assigned',
}) => {
  'id': id,
  'customerId': 'CUS-1042',
  'customerName': 'Olivia Bennett',
  'customerPhone': '+1 (415) 555-0182',
  'deliveryAddress': '1 Market Street, San Francisco',
  'items': [
    {
      'menuItemId': 'FOOD-010',
      'name': 'Iced Matcha Latte',
      'quantity': 2,
      'unitPrice': 6,
      'lineTotal': 12,
    },
  ],
  'total': 12,
  'status': status,
  'riderId': 'RID-208',
  'paymentMethod': 'Cash',
  'createdAt': '2026-11-07T10:00:00.000Z',
  'updatedAt': '2026-11-07T10:30:00.000Z',
};

http.Response jsonResponse(Object body, {int statusCode = 200}) =>
    http.Response(jsonEncode(body), statusCode);

void main() {
  const baseUrl = 'https://api.test/api';
  late MemoryTokenStore tokenStore;

  setUp(() {
    tokenStore = MemoryTokenStore();
  });

  test(
    'login posts backend credentials and securely stores returned token',
    () async {
      final received = <http.Request>[];
      final service = RiderApiService(
        baseUrl: baseUrl,
        tokenStore: tokenStore,
        client: MockClient((request) async {
          received.add(request);
          if (request.url.path.endsWith('/auth/rider/login')) {
            return jsonResponse({
              'data': {
                'token': 'signed.jwt',
                'tokenType': 'Bearer',
                'expiresIn': '8h',
                'user': rider(),
              },
            });
          }
          return jsonResponse({
            'data': rider(id: 'RID-208', availability: 'Off duty'),
          });
        }),
      );

      final profile = await service.login(
        ' daniel.brooks@quickbite.test ',
        'RiderDemo123',
      );

      expect(received[0].method, 'POST');
      expect(received[0].url.toString(), '$baseUrl/auth/rider/login');
      expect(jsonDecode(received[0].body), {
        'email': 'daniel.brooks@quickbite.test',
        'password': 'RiderDemo123',
      });
      expect(received[1].method, 'GET');
      expect(received[1].url.toString(), '$baseUrl/rider/me');
      expect(received[1].headers['authorization'], 'Bearer signed.jwt');
      expect(tokenStore.token, 'signed.jwt');
      expect(profile.id, 'RID-208');
      expect(profile.name, 'Daniel Brooks');
      expect(profile.availability, 'Off duty');
    },
  );

  test(
    'invalid credentials are rejected and do not create a session',
    () async {
      final service = RiderApiService(
        baseUrl: baseUrl,
        tokenStore: tokenStore,
        client: MockClient(
          (_) async => jsonResponse({
            'error': {
              'code': 'INVALID_CREDENTIALS',
              'message': 'Email or password is incorrect.',
            },
          }, statusCode: 401),
        ),
      );

      await expectLater(
        service.login('nobody@example.com', 'wrong-password'),
        throwsA(
          isA<RiderApiException>()
              .having((error) => error.statusCode, 'statusCode', 401)
              .having((error) => error.code, 'code', 'INVALID_CREDENTIALS'),
        ),
      );
      expect(tokenStore.token, isNull);
    },
  );

  test('restores rider profile from the Rider profile endpoint', () async {
    tokenStore.token = 'saved.jwt';
    late http.Request received;
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: tokenStore,
      client: MockClient((request) async {
        received = request;
        return jsonResponse({'data': rider()});
      }),
    );

    final profile = await service.restoreSession();

    expect(received.method, 'GET');
    expect(received.url.toString(), '$baseUrl/rider/me');
    expect(received.headers['authorization'], 'Bearer saved.jwt');
    expect(profile?.email, 'daniel.brooks@quickbite.test');
  });

  test(
    'expired session is cleared when backend rejects the saved token',
    () async {
      tokenStore.token = 'expired.jwt';
      final service = RiderApiService(
        baseUrl: baseUrl,
        tokenStore: tokenStore,
        client: MockClient(
          (_) async => jsonResponse({
            'error': {
              'code': 'INVALID_TOKEN',
              'message': 'The access token is invalid or expired.',
            },
          }, statusCode: 401),
        ),
      );

      await expectLater(
        service.restoreSession(),
        throwsA(isA<RiderApiException>()),
      );
      expect(tokenStore.token, isNull);
    },
  );

  test('assigned and history orders map backend order records', () async {
    tokenStore.token = 'saved.jwt';
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: tokenStore,
      client: MockClient((request) async {
        expect(request.headers['authorization'], 'Bearer saved.jwt');
        if (request.url.path.endsWith('/history')) {
          return jsonResponse({
            'data': [order(status: 'Delivered')],
          });
        }
        return jsonResponse({
          'data': [order()],
        });
      }),
    );

    final assigned = await service.assignedOrders();
    final history = await service.deliveryHistory();

    expect(assigned.single.status, 'Assigned');
    expect(assigned.single.address, '1 Market Street, San Francisco');
    expect(assigned.single.items, ['Iced Matcha Latte × 2']);
    expect(assigned.single.amount, 12);
    expect(history.single.status, 'Delivered');
    expect(
      history.single.createdAt,
      DateTime.parse('2026-11-07T10:30:00.000Z'),
    );
  });

  test('notifications are fetched read-only and map display fields', () async {
    tokenStore.token = 'saved.jwt';
    late http.Request received;
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: tokenStore,
      client: MockClient((request) async {
        received = request;
        return jsonResponse({
          'data': [
            {
              'id': 'NTF-001',
              'title': 'Service update',
              'message': 'A test notification.',
              'read': false,
              'createdAt': '2026-01-02T03:04:05.000Z',
            },
          ],
        });
      }),
    );

    final notifications = await service.notifications();

    expect(received.method, 'GET');
    expect(received.url.toString(), '$baseUrl/rider/notifications');
    expect(received.headers['authorization'], 'Bearer saved.jwt');
    expect(notifications.single.id, 'NTF-001');
    expect(notifications.single.title, 'Service update');
    expect(notifications.single.message, 'A test notification.');
    expect(notifications.single.read, isFalse);
    expect(
      notifications.single.createdAt,
      DateTime.parse('2026-01-02T03:04:05.000Z'),
    );
  });

  test('earnings map backend periods and delivery totals', () async {
    tokenStore.token = 'saved.jwt';
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: tokenStore,
      client: MockClient(
        (_) async => jsonResponse({
          'data': {
            'commissionRate': 0.1,
            'today': {'deliveries': 1, 'earnings': 1.2},
            'week': {'deliveries': 2, 'earnings': 2.4},
            'month': {'deliveries': 3, 'earnings': 3.6},
            'completedDeliveries': 3,
            'activeDeliveries': 1,
            'cashToCollect': 12,
          },
        }),
      ),
    );

    final statistics = await service.statistics();

    expect(statistics.todayEarnings, 1.2);
    expect(statistics.weekEarnings, 2.4);
    expect(statistics.monthEarnings, 3.6);
    expect(statistics.completedOrders, 3);
    expect(statistics.activeOrders, 1);
    expect(statistics.cashToCollect, 12);
  });

  test(
    'rider actions use existing endpoints and exact request bodies',
    () async {
      tokenStore.token = 'saved.jwt';
      final received = <http.Request>[];
      final service = RiderApiService(
        baseUrl: baseUrl,
        tokenStore: tokenStore,
        client: MockClient((request) async {
          received.add(request);
          if (request.url.path.endsWith('/availability')) {
            return jsonResponse({'data': rider(availability: 'Off duty')});
          }
          return jsonResponse({'data': order()});
        }),
      );

      await service.acceptOrder('QB-3001');
      await service.rejectOrder('QB-3001');
      await service.updateOrderStatus('QB-3001', 'Picked Up');
      final updatedRider = await service.setAvailability('Off duty');

      expect(
        received.map((request) => '${request.method} ${request.url.path}'),
        [
          'POST /api/rider/orders/QB-3001/accept',
          'POST /api/rider/orders/QB-3001/reject',
          'PATCH /api/rider/orders/QB-3001/status',
          'PATCH /api/rider/availability',
        ],
      );
      expect(jsonDecode(received[2].body), {'status': 'Picked Up'});
      expect(jsonDecode(received[3].body), {'availability': 'Off duty'});
      expect(updatedRider.availability, 'Off duty');
    },
  );

  test('logout clears local token even when backend logout fails', () async {
    tokenStore.token = 'saved.jwt';
    final service = RiderApiService(
      baseUrl: baseUrl,
      tokenStore: tokenStore,
      client: MockClient(
        (_) async => jsonResponse({
          'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'Sign-out notification failed.',
          },
        }, statusCode: 500),
      ),
    );

    await expectLater(service.logout(), throwsA(isA<RiderApiException>()));
    expect(tokenStore.token, isNull);
  });
}
