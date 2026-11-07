import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'demo_service.dart';

String get riderApiBaseUrl {
  const configuredUrl = String.fromEnvironment('QUICKBITE_API_BASE_URL');
  if (configuredUrl.isNotEmpty) return configuredUrl;
  return kIsWeb || defaultTargetPlatform != TargetPlatform.android
      ? 'http://127.0.0.1:4000/api'
      : 'http://10.0.2.2:4000/api';
}

abstract interface class SessionTokenStore {
  Future<String?> readToken();
  Future<void> writeToken(String token);
  Future<void> clearToken();
}

class SecureSessionTokenStore implements SessionTokenStore {
  SecureSessionTokenStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'quickbite_rider_access_token';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> readToken() => _storage.read(key: _tokenKey);

  @override
  Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  @override
  Future<void> clearToken() => _storage.delete(key: _tokenKey);
}

class RiderApiException implements Exception {
  const RiderApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class RiderNotification {
  const RiderNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.read,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final bool read;
}

class RiderApiService {
  RiderApiService({
    http.Client? client,
    SessionTokenStore? tokenStore,
    String? baseUrl,
  }) : _client = client ?? http.Client(),
       _tokenStore = tokenStore ?? SecureSessionTokenStore(),
       _baseUrl = (baseUrl ?? riderApiBaseUrl).replaceFirst(
         RegExp(r'/+$'),
         '',
       );

  final http.Client _client;
  final SessionTokenStore _tokenStore;
  final String _baseUrl;

  Future<RiderProfile> login(String email, String password) async {
    final response = await _request(
      'POST',
      '/auth/rider/login',
      body: {'email': email.trim(), 'password': password},
      authenticated: false,
    );
    final data = _object(response['data'], 'login data');
    final token = data['token'];
    if (token is! String || token.isEmpty) {
      throw const RiderApiException('The API did not return an access token.');
    }
    final rider = _parseRider(data['user']);
    if (rider.role != 'rider') {
      throw const RiderApiException('This account is not a rider account.');
    }
    await _tokenStore.writeToken(token);
    try {
      return await riderProfile();
    } on RiderApiException {
      await _tokenStore.clearToken();
      rethrow;
    }
  }

  Future<RiderProfile?> restoreSession() async {
    final token = await _tokenStore.readToken();
    if (token == null || token.isEmpty) return null;
    try {
      return await riderProfile();
    } on RiderApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await _tokenStore.clearToken();
        if (error.statusCode == 403) return null;
      }
      rethrow;
    }
  }

  Future<RiderProfile> riderProfile() async {
    final response = await _request('GET', '/rider/me');
    final rider = _parseRider(response['data']);
    if (rider.role != 'rider') {
      throw const RiderApiException('This account is not a rider account.');
    }
    return rider;
  }

  Future<void> logout() async {
    try {
      final token = await _tokenStore.readToken();
      if (token != null && token.isNotEmpty) {
        await _request('POST', '/auth/logout');
      }
    } finally {
      await _tokenStore.clearToken();
    }
  }

  Future<List<DeliveryOrder>> assignedOrders() async {
    final response = await _request('GET', '/rider/orders/assigned');
    return _parseOrders(response['data']);
  }

  Future<List<DeliveryOrder>> deliveryHistory() async {
    final response = await _request('GET', '/rider/orders/history');
    return _parseOrders(response['data'], history: true);
  }

  Future<List<RiderNotification>> notifications() async {
    final response = await _request('GET', '/rider/notifications');
    final value = response['data'];
    if (value is! List) {
      throw const RiderApiException(
        'The API returned an invalid notifications list.',
      );
    }
    return value.map(_parseNotification).toList(growable: false);
  }

  Future<RiderStatistics> statistics() async {
    final response = await _request('GET', '/rider/earnings');
    final data = _object(response['data'], 'earnings data');
    final today = _object(data['today'], 'today earnings');
    final week = _object(data['week'], 'week earnings');
    final month = _object(data['month'], 'month earnings');
    return RiderStatistics(
      todayEarnings: _number(today['earnings'], 'today.earnings'),
      weekEarnings: _number(week['earnings'], 'week.earnings'),
      monthEarnings: _number(month['earnings'], 'month.earnings'),
      completedOrders: _integer(
        data['completedDeliveries'],
        'completedDeliveries',
      ),
      activeOrders: _integer(data['activeDeliveries'], 'activeDeliveries'),
      cashToCollect: _number(data['cashToCollect'], 'cashToCollect'),
    );
  }

  Future<void> acceptOrder(String orderId) async {
    await _request(
      'POST',
      '/rider/orders/${Uri.encodeComponent(orderId)}/accept',
    );
  }

  Future<void> rejectOrder(String orderId) async {
    await _request(
      'POST',
      '/rider/orders/${Uri.encodeComponent(orderId)}/reject',
    );
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    await _request(
      'PATCH',
      '/rider/orders/${Uri.encodeComponent(orderId)}/status',
      body: {'status': status},
    );
  }

  Future<RiderProfile> setAvailability(String availability) async {
    final response = await _request(
      'PATCH',
      '/rider/availability',
      body: {'availability': availability},
    );
    return _parseRider(response['data']);
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, Object?>? body,
    bool authenticated = true,
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      final token = await _tokenStore.readToken();
      if (token == null || token.isEmpty) {
        throw const RiderApiException('Please sign in to continue.');
      }
      headers['Authorization'] = 'Bearer $token';
    }

    final uri = Uri.parse('$_baseUrl$path');
    late http.Response response;
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 20));
      response = await http.Response.fromStream(
        streamed,
      ).timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw const RiderApiException('The QuickBite API request timed out.');
    } on http.ClientException {
      throw const RiderApiException(
        'Unable to reach the QuickBite API. Check the server and network.',
      );
    }

    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        throw RiderApiException(
          'The QuickBite API returned an invalid response.',
          statusCode: response.statusCode,
        );
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded is Map<String, dynamic> ? decoded['error'] : null;
      final errorMap = error is Map<String, dynamic> ? error : null;
      throw RiderApiException(
        errorMap?['message'] is String
            ? errorMap!['message'] as String
            : 'The API request failed (${response.statusCode}).',
        statusCode: response.statusCode,
        code: errorMap?['code'] is String ? errorMap!['code'] as String : null,
      );
    }
    if (decoded is! Map<String, dynamic>) {
      throw RiderApiException(
        'The QuickBite API returned an invalid response.',
        statusCode: response.statusCode,
      );
    }
    return decoded;
  }

  List<DeliveryOrder> _parseOrders(dynamic value, {bool history = false}) {
    if (value is! List) {
      throw const RiderApiException('The API returned an invalid orders list.');
    }
    return value
        .map((item) => _parseOrder(item, history: history))
        .toList(growable: false);
  }

  DeliveryOrder _parseOrder(dynamic value, {required bool history}) {
    final order = _object(value, 'order');
    final itemsValue = order['items'];
    if (itemsValue is! List) {
      throw const RiderApiException('The API returned an invalid order.');
    }
    final items = itemsValue
        .map((item) {
          final line = _object(item, 'order item');
          final name = _string(line['name'], 'item name');
          final quantity = _integer(line['quantity'], 'item quantity');
          return '$name × $quantity';
        })
        .toList(growable: false);
    final updatedAt = _date(order['updatedAt']);
    return DeliveryOrder(
      id: _string(order['id'], 'order id'),
      customerName: _optionalString(order['customerName']),
      customerPhone: _optionalString(order['customerPhone']),
      address: _optionalString(order['deliveryAddress']),
      items: items,
      amount: _number(order['total'], 'order total'),
      status: _string(order['status'], 'order status'),
      createdAt: history
          ? (updatedAt ?? _date(order['createdAt']))
          : _date(order['createdAt']),
      paymentMethod: _optionalString(order['paymentMethod']).isEmpty
          ? 'Cash'
          : _optionalString(order['paymentMethod']),
    );
  }

  RiderNotification _parseNotification(dynamic value) {
    final notification = _object(value, 'notification');
    final createdAt = _date(notification['createdAt']);
    if (createdAt == null) {
      throw const RiderApiException(
        'The API returned a notification with an invalid date.',
      );
    }
    final read = notification['read'];
    if (read is! bool) {
      throw const RiderApiException(
        'The API returned a notification with an invalid read state.',
      );
    }
    return RiderNotification(
      id: _string(notification['id'], 'notification id'),
      title: _string(notification['title'], 'notification title'),
      message: _string(notification['message'], 'notification message'),
      createdAt: createdAt,
      read: read,
    );
  }

  RiderProfile _parseRider(dynamic value) {
    final user = _object(value, 'rider profile');
    return RiderProfile(
      id: _string(user['id'], 'rider id'),
      name: _optionalString(user['name']),
      email: _optionalString(user['email']),
      phone: _optionalString(user['phone']),
      role: _optionalString(user['role']),
      availability: _optionalString(user['availability']).isEmpty
          ? 'Off duty'
          : _optionalString(user['availability']),
    );
  }

  Map<String, dynamic> _object(dynamic value, String label) {
    if (value is Map<String, dynamic>) return value;
    throw RiderApiException('The API returned invalid $label.');
  }

  String _string(dynamic value, String label) {
    if (value is String && value.isNotEmpty) return value;
    throw RiderApiException('The API returned invalid $label.');
  }

  String _optionalString(dynamic value) => value is String ? value : '';

  double _number(dynamic value, String label) {
    if (value is num) return value.toDouble();
    throw RiderApiException('The API returned invalid $label.');
  }

  int _integer(dynamic value, String label) {
    if (value is int) return value;
    throw RiderApiException('The API returned invalid $label.');
  }

  DateTime? _date(dynamic value) =>
      value is String ? DateTime.tryParse(value) : null;
}

final RiderApiService riderApiService = RiderApiService();
