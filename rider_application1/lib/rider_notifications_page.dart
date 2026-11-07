import 'package:flutter/material.dart';

import 'cafe_theme.dart';
import 'rider_api_service.dart';

class RiderNotificationsPage extends StatefulWidget {
  const RiderNotificationsPage({super.key, required this.apiService});

  final RiderApiService apiService;

  @override
  State<RiderNotificationsPage> createState() => _RiderNotificationsPageState();
}

class _RiderNotificationsPageState extends State<RiderNotificationsPage> {
  bool _isLoading = true;
  String? _error;
  List<RiderNotification> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final notifications = await widget.apiService.notifications();
      if (!mounted) return;
      setState(() => _notifications = notifications);
    } on RiderApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDate(DateTime date) {
    final local = date.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }

  Widget _notificationCard(RiderNotification notification) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: ListTile(
      leading: Icon(
        notification.read
            ? Icons.notifications_none_outlined
            : Icons.notifications_active_outlined,
        color: primaryGreen,
      ),
      title: Text(
        notification.title,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.message),
            const SizedBox(height: 8),
            Text(
              _formatDate(notification.createdAt),
              style: const TextStyle(color: neutralText, fontSize: 12),
            ),
          ],
        ),
      ),
      isThreeLine: true,
    ),
  );

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _loadNotifications,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const Text(
          'Notifications',
          style: TextStyle(
            fontSize: 25,
            fontWeight: FontWeight.bold,
            color: darkGreen,
          ),
        ),
        const SizedBox(height: 16),
        if (_isLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(28),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_error != null) ...[
          Text(_error!, style: const TextStyle(color: Colors.red)),
          TextButton(
            onPressed: _loadNotifications,
            child: const Text('Retry'),
          ),
        ] else if (_notifications.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 36),
            child: Column(
              children: [
                Icon(
                  Icons.notifications_none_outlined,
                  size: 48,
                  color: primaryGreen,
                ),
                SizedBox(height: 12),
                Text('No notifications yet.'),
              ],
            ),
          )
        else
          ..._notifications.map(_notificationCard),
      ],
    ),
  );
}
