import 'dart:io';

import 'package:flutter/material.dart';

import 'cafe_theme.dart';
import 'demo_service.dart';
import 'drawer.dart';
import 'earning_page.dart';
import 'order_page.dart';
import 'rider_api_service.dart';
import 'rider_notifications_page.dart';

class RiderDashboard extends StatefulWidget {
  RiderDashboard({
    super.key,
    required this.riderName,
    required this.riderEmail,
    required this.riderPhone,
    this.profileImagePath,
    this.riderAvailability = 'Available',
    RiderApiService? apiService,
  }) : apiService = apiService ?? riderApiService;

  final RiderApiService apiService;
  final String riderName;
  final String riderEmail;
  final String riderPhone;
  final String? profileImagePath;
  final String riderAvailability;

  @override
  State<RiderDashboard> createState() => _RiderDashboardState();
}

class _RiderDashboardState extends State<RiderDashboard> {
  int _selectedIndex = 0;
  late bool _isOnline;
  bool _isUpdatingAvailability = false;
  bool _isLoading = true;
  String? _error;
  late RiderProfile _profile;
  List<DeliveryOrder> _orders = [];
  List<DeliveryOrder> _history = [];
  RiderStatistics? _statistics;

  List<DeliveryOrder> get _incomingOrders => _orders
      .where((order) => order.status.toLowerCase() == 'assigned')
      .toList();

  List<DeliveryOrder> get _activeOrders => _orders
      .where(
        (order) =>
            order.status.toLowerCase() != 'assigned' &&
            order.status.toLowerCase() != 'delivered',
      )
      .toList();

  String get _displayName =>
      _profile.name.trim().isNotEmpty ? _profile.name.trim() : 'Rider';

  ImageProvider? get _profileImage {
    final path = widget.profileImagePath;
    if (path == null || path.isEmpty) return null;
    try {
      if (File(path).existsSync()) return FileImage(File(path));
    } catch (_) {
      return null;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _profile = RiderProfile(
      id: '',
      name: widget.riderName,
      email: widget.riderEmail,
      phone: widget.riderPhone,
      availability: widget.riderAvailability,
    );
    _isOnline = _profile.availability == 'Available';
    _loadDashboard();
  }

  Future<void> _loadDashboard({bool showLoading = true}) async {
    if (showLoading && mounted) setState(() => _isLoading = true);
    try {
      final results = await Future.wait<dynamic>([
        widget.apiService.assignedOrders(),
        widget.apiService.deliveryHistory(),
        widget.apiService.statistics(),
      ]);
      if (!mounted) return;
      setState(() {
        _orders = results[0] as List<DeliveryOrder>;
        _history = results[1] as List<DeliveryOrder>;
        _statistics = results[2] as RiderStatistics;
        _error = null;
      });
    } on RiderApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _acceptOrder(DeliveryOrder order) async {
    if (!_isOnline) {
      _showMessage('Go online to accept orders.');
      return;
    }
    try {
      await widget.apiService.acceptOrder(order.id);
      _showMessage('Order #${order.id} accepted.');
      await _loadDashboard(showLoading: false);
    } on RiderApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _rejectOrder(DeliveryOrder order) async {
    try {
      await widget.apiService.rejectOrder(order.id);
      _showMessage('Order #${order.id} rejected.');
      await _loadDashboard(showLoading: false);
    } on RiderApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _advanceOrder(DeliveryOrder order) async {
    final next = DeliveryWorkflow.nextStatus(order.status);
    if (next == null) {
      _showMessage('This delivery cannot advance from ${order.status}.');
      return;
    }
    try {
      await widget.apiService.updateOrderStatus(order.id, next);
      _showMessage('Order #${order.id} updated to $next.');
      await _loadDashboard(showLoading: false);
    } on RiderApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _setAvailability(bool isOnline) async {
    if (_isUpdatingAvailability) return;
    setState(() => _isUpdatingAvailability = true);
    try {
      final rider = await widget.apiService.setAvailability(
        isOnline ? 'Available' : 'Off duty',
      );
      if (mounted) {
        setState(() {
          _profile = rider;
          _isOnline = rider.availability == 'Available';
        });
      }
    } on RiderApiException catch (error) {
      _showMessage(error.message);
    } finally {
      if (mounted) setState(() => _isUpdatingAvailability = false);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: primaryOrange),
    );
  }

  Widget _buildHeader() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Row(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: primaryOrange.withValues(alpha: 0.12),
          backgroundImage: _profileImage,
          child: _profileImage == null
              ? const Icon(Icons.person, size: 35, color: primaryOrange)
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hi, $_displayName',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: darkBackground,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'QuickBite Rider',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
        const SizedBox(width: 5),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            border: Border.all(color: primaryOrange),
            borderRadius: BorderRadius.circular(25),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _isOnline ? 'Online' : 'Offline',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: primaryOrange,
                ),
              ),
              const SizedBox(width: 3),
              Transform.scale(
                scale: 0.75,
                child: Switch(
                  value: _isOnline,
                  activeThumbColor: Colors.white,
                  activeTrackColor: primaryOrange,
                  inactiveThumbColor: Colors.white,
                  inactiveTrackColor: Colors.grey,
                  onChanged: _isUpdatingAvailability ? null : _setAvailability,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required VoidCallback onTap,
    bool highlighted = false,
  }) => Expanded(
    child: Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 150),
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            decoration: BoxDecoration(
              color: highlighted
                  ? primaryOrange.withValues(alpha: 0.10)
                  : Colors.white,
              border: Border.all(
                color: highlighted
                    ? primaryOrange.withValues(alpha: 0.5)
                    : Colors.grey.shade300,
              ),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Column(
              children: [
                Container(
                  height: 38,
                  width: 38,
                  decoration: BoxDecoration(
                    color: primaryOrange.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: primaryOrange, size: 24),
                ),
                const SizedBox(height: 9),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 7),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                      color: darkBackground,
                    ),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 9, color: primaryOrange),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );

  Widget _buildStatistics() {
    final stats = _statistics;
    String money(double? value) =>
        value == null ? '—' : 'PKR ${value.toStringAsFixed(2)}';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStatCard(
          icon: Icons.account_balance_wallet,
          title: "Today's Earnings",
          value: money(stats?.todayEarnings),
          subtitle: 'From completed deliveries',
          highlighted: true,
          onTap: () => _onTabSelected(2),
        ),
        const SizedBox(width: 8),
        _buildStatCard(
          icon: Icons.inventory_2_outlined,
          title: 'Completed Orders',
          value: stats?.completedOrders.toString() ?? '—',
          subtitle: '${stats?.activeOrders ?? '—'} active',
          onTap: () => _onTabSelected(1),
        ),
        const SizedBox(width: 8),
        _buildStatCard(
          icon: Icons.payments_outlined,
          title: 'Cash to Collect',
          value: money(stats?.cashToCollect),
          subtitle: 'Current assigned orders',
          onTap: () => _onTabSelected(2),
        ),
      ],
    );
  }

  Widget _buildHomeOrderCard(DeliveryOrder order) {
    final isAssigned = order.status.toLowerCase() == 'assigned';
    final next = DeliveryWorkflow.nextStatus(order.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.09),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.receipt_long_outlined,
                color: primaryOrange,
                size: 25,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Order #${order.id}',
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.bold,
                    color: darkBackground,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: primaryOrange,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  order.status,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          _homeDetail(
            Icons.person_outline,
            order.customerName.isEmpty
                ? 'Customer details unavailable'
                : order.customerName,
          ),
          if (order.customerPhone.isNotEmpty)
            _homeDetail(Icons.phone_outlined, order.customerPhone),
          _homeDetail(
            Icons.location_on_outlined,
            order.address.isEmpty ? 'Address unavailable' : order.address,
          ),
          if (order.items.isNotEmpty)
            _homeDetail(Icons.restaurant_menu, order.items.join(', ')),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'PKR ${order.amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: primaryOrange,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (isAssigned) ...[
                OutlinedButton(
                  onPressed: () => _rejectOrder(order),
                  child: const Text('Reject'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isOnline ? () => _acceptOrder(order) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryOrange,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Accept'),
                ),
              ] else if (next != null)
                ElevatedButton(
                  onPressed: () => _advanceOrder(order),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryOrange,
                    foregroundColor: Colors.white,
                  ),
                  child: Text(next),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _homeDetail(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: primaryOrange),
        const SizedBox(width: 7),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    ),
  );

  Widget _buildHomePage() => RefreshIndicator(
    onRefresh: _loadDashboard,
    child: ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        _buildHeader(),
        const SizedBox(height: 20),
        _buildStatistics(),
        const SizedBox(height: 27),
        Row(
          children: [
            const Expanded(
              child: Text(
                'New Incoming Orders',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: darkBackground,
                ),
              ),
            ),
            TextButton(
              onPressed: () => _onTabSelected(1),
              child: const Text(
                'See all →',
                style: TextStyle(
                  color: primaryOrange,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(28),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_error != null)
          Column(
            children: [
              Text(_error!, style: const TextStyle(color: Colors.red)),
              TextButton(onPressed: _loadDashboard, child: const Text('Retry')),
            ],
          )
        else if (_incomingOrders.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              children: [
                Icon(Icons.inbox_outlined, size: 50, color: primaryOrange),
                SizedBox(height: 10),
                Text(
                  'No new incoming orders',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                ),
                SizedBox(height: 5),
                Text(
                  'New assigned orders will appear here.',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          )
        else
          ..._incomingOrders.map(_buildHomeOrderCard),
      ],
    ),
  );

  void _onTabSelected(int index) => setState(() => _selectedIndex = index);

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _buildHomePage(),
      OrdersPage(
        incomingOrders: _incomingOrders,
        acceptedOrders: _activeOrders,
        historyOrders: _history,
        isOnline: _isOnline,
        isLoading: _isLoading,
        error: _error,
        onAccept: _acceptOrder,
        onReject: _rejectOrder,
        onAdvanceStatus: _advanceOrder,
        onRefresh: _loadDashboard,
      ),
      EarningsPage(
        statistics: _statistics,
        isLoading: _isLoading,
        error: _error,
        onRefresh: _loadDashboard,
      ),
      RiderNotificationsPage(apiService: widget.apiService),
    ];
    return Scaffold(
      backgroundColor: creamBackground,
      appBar: AppBar(
        title: const Text(
          'Rider Dashboard',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: primaryOrange,
        foregroundColor: Colors.white,
        centerTitle: true,
        automaticallyImplyLeading: false,
        actions: [
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.account_circle, size: 30),
              tooltip: 'Open rider menu',
              onPressed: () => Scaffold.of(context).openEndDrawer(),
            ),
          ),
        ],
      ),
      endDrawer: DrawerPage(
        riderName: _profile.name,
        riderEmail: _profile.email,
        riderPhone: _profile.phone,
        profileImagePath: widget.profileImagePath,
        apiService: widget.apiService,
      ),
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: _onTabSelected,
            backgroundColor: Colors.white,
            selectedItemColor: primaryOrange,
            unselectedItemColor: Colors.grey.shade600,
            selectedFontSize: 13,
            unselectedFontSize: 13,
            type: BottomNavigationBarType.fixed,
            elevation: 0,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.local_shipping_outlined),
                activeIcon: Icon(Icons.local_shipping),
                label: 'Orders',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.bar_chart_outlined),
                activeIcon: Icon(Icons.bar_chart),
                label: 'Earnings',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.notifications_outlined),
                activeIcon: Icon(Icons.notifications),
                label: 'Notifications',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
