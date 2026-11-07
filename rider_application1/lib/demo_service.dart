class RiderProfile {
  const RiderProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.role = 'rider',
    this.availability = 'Available',
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String availability;
}

class DeliveryOrder {
  const DeliveryOrder({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.address,
    required this.items,
    required this.amount,
    required this.status,
    this.createdAt,
    this.paymentMethod = 'Cash',
  });

  final String id;
  final String customerName;
  final String customerPhone;
  final String address;
  final List<String> items;
  final double amount;
  final String status;
  final DateTime? createdAt;
  final String paymentMethod;

  DeliveryOrder copyWith({String? status, DateTime? createdAt}) =>
      DeliveryOrder(
        id: id,
        customerName: customerName,
        customerPhone: customerPhone,
        address: address,
        items: items,
        amount: amount,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        paymentMethod: paymentMethod,
      );
}

class RiderStatistics {
  const RiderStatistics({
    required this.todayEarnings,
    required this.weekEarnings,
    required this.monthEarnings,
    required this.completedOrders,
    required this.activeOrders,
    required this.cashToCollect,
  });

  final double todayEarnings;
  final double weekEarnings;
  final double monthEarnings;
  final int completedOrders;
  final int activeOrders;
  final double cashToCollect;
}

class DemoServiceException implements Exception {
  const DemoServiceException(this.message);
  final String message;

  @override
  String toString() => message;
}

class DeliveryWorkflow {
  static const statuses = <String>[
    'Assigned',
    'Accepted',
    'Picked Up',
    'On the Way',
    'Delivered',
  ];

  static String? nextStatus(String current) {
    final index = statuses.indexOf(current);
    return index >= 0 && index < statuses.length - 1
        ? statuses[index + 1]
        : null;
  }
}

/// Local, in-memory data for the rider frontend prototype. No server is used.
class DemoRiderService {
  DemoRiderService() {
    reset();
  }

  static final DateTime _now = DateTime.now();
  final Map<String, RiderProfile> _profiles = {};
  final List<DeliveryOrder> _orders = [];
  final List<DeliveryOrder> _history = [];
  RiderProfile? _currentRider;

  RiderProfile? get currentRiderProfile => _currentRider;
  bool get hasSession => _currentRider != null;

  void reset() {
    _profiles.clear();
    _orders
      ..clear()
      ..addAll([
        DeliveryOrder(
          id: 'QB-2847',
          customerName: 'Ayesha Khan',
          customerPhone: '+92 300 1234567',
          address: '742 Oak Street, Gulberg',
          items: const ['Cappuccino × 2', 'Chocolate Croissant × 1'],
          amount: 1260,
          status: 'Assigned',
        ),
        DeliveryOrder(
          id: 'QB-2846',
          customerName: 'Hamza Ali',
          customerPhone: '+92 321 7654321',
          address: '120 Pine Avenue, Model Town',
          items: const ['Iced Latte × 1', 'Club Sandwich × 1'],
          amount: 980,
          status: 'Assigned',
          paymentMethod: 'Online',
        ),
      ]);
    _history
      ..clear()
      ..add(
        DeliveryOrder(
          id: 'QB-2844',
          customerName: 'Sara Ahmed',
          customerPhone: '+92 333 9876543',
          address: 'Garden Town',
          items: const ['Flat White × 1'],
          amount: 520,
          status: 'Delivered',
          createdAt: DateTime(_now.year, _now.month, _now.day),
        ),
      );
    _currentRider = null;
  }

  Future<RiderProfile> login(String email, String password) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(normalizedEmail) ||
        password.length < 8) {
      throw const DemoServiceException(
        'Enter a valid email and password of at least 8 characters.',
      );
    }
    final existing = _profiles[normalizedEmail];
    _currentRider =
        existing ??
        RiderProfile(
          id: 'DEMO-RIDER',
          name: _nameFromEmail(normalizedEmail),
          email: normalizedEmail,
          phone: '',
        );
    return _currentRider!;
  }

  Future<RiderProfile> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2 ||
        !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(normalizedEmail) ||
        !RegExp(r'^\+?[0-9\s()-]{7,20}$').hasMatch(phone.trim()) ||
        password.length < 8) {
      throw const DemoServiceException(
        'Please check your details and try again.',
      );
    }
    if (_profiles.containsKey(normalizedEmail)) {
      throw const DemoServiceException(
        'An account with this email already exists in this demo session.',
      );
    }
    final profile = RiderProfile(
      id: 'DEMO-RIDER',
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
    );
    _profiles[normalizedEmail] = profile;
    _currentRider = profile;
    return profile;
  }

  Future<void> logout() async {
    _currentRider = null;
  }

  Future<List<DeliveryOrder>> assignedOrders() async =>
      List.unmodifiable(_orders);

  Future<List<DeliveryOrder>> deliveryHistory() async =>
      List.unmodifiable(_history);

  Future<RiderStatistics> statistics() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekStart = today.subtract(Duration(days: today.weekday - 1));
    final monthStart = DateTime(now.year, now.month);
    double earningsSince(DateTime from) => _history
        .where(
          (order) =>
              order.createdAt != null && !order.createdAt!.isBefore(from),
        )
        .fold(0, (total, order) => total + order.amount);
    return RiderStatistics(
      todayEarnings: earningsSince(today),
      weekEarnings: earningsSince(weekStart),
      monthEarnings: earningsSince(monthStart),
      completedOrders: _history.length,
      activeOrders: _orders.where((order) => order.status != 'Assigned').length,
      cashToCollect: _orders
          .where((order) => order.paymentMethod == 'Cash')
          .fold(0, (total, order) => total + order.amount),
    );
  }

  Future<void> acceptOrder(String orderId) async {
    final index = _orders.indexWhere((order) => order.id == orderId);
    if (index < 0 || _orders[index].status != 'Assigned') {
      throw const DemoServiceException(
        'This order is no longer available to accept.',
      );
    }
    _orders[index] = _orders[index].copyWith(status: 'Accepted');
  }

  Future<void> rejectOrder(String orderId) async {
    final index = _orders.indexWhere((order) => order.id == orderId);
    if (index < 0 || _orders[index].status != 'Assigned') {
      throw const DemoServiceException('Only assigned orders can be rejected.');
    }
    _orders.removeAt(index);
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    final index = _orders.indexWhere((order) => order.id == orderId);
    if (index < 0) throw const DemoServiceException('Delivery not found.');
    final order = _orders[index];
    if (DeliveryWorkflow.nextStatus(order.status) != status) {
      throw DemoServiceException(
        'Invalid delivery status transition: ${order.status} → $status.',
      );
    }
    final updated = order.copyWith(
      status: status,
      createdAt: status == 'Delivered' ? DateTime.now() : order.createdAt,
    );
    if (status == 'Delivered') {
      _orders.removeAt(index);
      _history.insert(0, updated);
    } else {
      _orders[index] = updated;
    }
  }

  static String _nameFromEmail(String email) => email
      .split('@')
      .first
      .split(RegExp(r'[._-]+'))
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

final DemoRiderService demoRiderService = DemoRiderService();
