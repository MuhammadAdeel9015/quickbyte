import 'package:flutter/material.dart';

import 'cafe_theme.dart';
import 'demo_service.dart';

class OrdersPage extends StatelessWidget {
  final List<DeliveryOrder> incomingOrders;
  final List<DeliveryOrder> acceptedOrders;
  final List<DeliveryOrder> historyOrders;
  final bool isOnline;
  final bool isLoading;
  final String? error;
  final Future<void> Function(DeliveryOrder) onAccept;
  final Future<void> Function(DeliveryOrder) onReject;
  final Future<void> Function(DeliveryOrder) onAdvanceStatus;
  final VoidCallback onRefresh;

  const OrdersPage({
    super.key,
    required this.incomingOrders,
    required this.acceptedOrders,
    required this.historyOrders,
    required this.isOnline,
    required this.isLoading,
    required this.error,
    required this.onAccept,
    required this.onReject,
    required this.onAdvanceStatus,
    required this.onRefresh,
  });

  Widget _buildOrderCard(DeliveryOrder order, {bool history = false}) {
    final isAssigned = order.status.toLowerCase() == 'assigned';
    final nextStatus = DeliveryWorkflow.nextStatus(order.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 15),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_outlined, color: primaryOrange, size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Order #${order.id}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: darkBackground),
                ),
              ),
              _statusChip(order.status),
            ],
          ),
          const SizedBox(height: 12),
          _detailRow(Icons.person_outline, order.customerName.isEmpty ? 'Customer details unavailable' : order.customerName),
          if (order.customerPhone.isNotEmpty)
            _detailRow(Icons.phone_outlined, order.customerPhone),
          _detailRow(Icons.location_on_outlined, order.address.isEmpty ? 'Delivery address unavailable' : order.address),
          if (order.items.isNotEmpty)
            _detailRow(Icons.restaurant_menu, order.items.join(', ')),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  'PKR ${order.amount.toStringAsFixed(2)}',
                  style: const TextStyle(color: primaryOrange, fontSize: 19, fontWeight: FontWeight.bold),
                ),
              ),
              if (!history && isAssigned) ...[
                OutlinedButton(
                  onPressed: () => onReject(order),
                  child: const Text('Reject'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: isOnline ? () => onAccept(order) : null,
                  style: ElevatedButton.styleFrom(backgroundColor: primaryOrange, foregroundColor: Colors.white),
                  child: const Text('Accept'),
                ),
              ] else if (!history && nextStatus != null) ...[
                ElevatedButton(
                  onPressed: () => onAdvanceStatus(order),
                  style: ElevatedButton.styleFrom(backgroundColor: primaryOrange, foregroundColor: Colors.white),
                  child: Text(nextStatus),
                ),
              ],
            ],
          ),
          if (history && order.createdAt != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                'Date: ${order.createdAt!.toLocal().toString().split(' ').first}',
                style: const TextStyle(color: Colors.black54, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(top: 7),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: primaryOrange),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
      ],
    ),
  );

  Widget _statusChip(String status) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: primaryOrange, borderRadius: BorderRadius.circular(20)),
    child: Text(status, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
  );

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async => onRefresh(),
    child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Expanded(child: Text('My Orders', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: darkBackground))),
            IconButton(onPressed: onRefresh, icon: const Icon(Icons.refresh), tooltip: 'Refresh orders'),
          ],
        ),
        const SizedBox(height: 6),
        const Text('Manage incoming and accepted orders.', style: TextStyle(color: Colors.grey)),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(error!, style: const TextStyle(color: Colors.red)),
          TextButton(onPressed: onRefresh, child: const Text('Try again')),
        ],
        if (isLoading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
        if (!isLoading && incomingOrders.isEmpty && acceptedOrders.isEmpty)
          const Padding(
            padding: EdgeInsets.all(28),
            child: Column(children: [Icon(Icons.inbox_outlined, size: 50, color: primaryOrange), SizedBox(height: 10), Text('No assigned orders.', style: TextStyle(fontSize: 15))]),
          ),
        if (incomingOrders.isNotEmpty) ...[
          const Text('Incoming Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: darkBackground)),
          const SizedBox(height: 12),
          ...incomingOrders.map(_buildOrderCard),
        ],
        if (acceptedOrders.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('Active Deliveries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: darkBackground)),
          const SizedBox(height: 12),
          ...acceptedOrders.map(_buildOrderCard),
        ],
        const SizedBox(height: 16),
        const Text('Delivery History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: darkBackground)),
        const SizedBox(height: 12),
        if (!isLoading && historyOrders.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 18), child: Text('No completed deliveries yet.', style: TextStyle(color: Colors.grey))),
        ...historyOrders.map((order) => _buildOrderCard(order, history: true)),
      ],
    ),
  );
}