import 'package:flutter/material.dart';

import 'cafe_theme.dart';
import 'demo_service.dart';

class EarningsPage extends StatelessWidget {
  final RiderStatistics? statistics;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onRefresh;

  const EarningsPage({
    super.key,
    required this.statistics,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
  });

  Widget _buildEarningTile({
    required String title,
    required String value,
    required IconData icon,
  }) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: primaryGreen, size: 27),
          const SizedBox(height: 12),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: darkGreen,
              ),
            ),
          ),
          const SizedBox(height: 5),
          Text(title, style: const TextStyle(fontSize: 12, color: neutralText)),
        ],
      ),
    ),
  );

  Widget _buildSummaryRow(String title, String amount) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        Expanded(child: Text(title, style: const TextStyle(fontSize: 15))),
        Text(
          amount,
          style: const TextStyle(
            color: primaryGreen,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final stats = statistics;
    String money(double? value) =>
        value == null ? '—' : 'PKR ${value.toStringAsFixed(2)}';
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text(
            'My Earnings',
            style: TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.bold,
              color: darkGreen,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Track your delivery income and performance.',
            style: TextStyle(color: neutralText),
          ),
          const SizedBox(height: 22),
          if (isLoading) const LinearProgressIndicator(),
          if (error != null) ...[
            Text(error!, style: const TextStyle(color: Colors.red)),
            TextButton(onPressed: onRefresh, child: const Text('Retry')),
          ],
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: primaryGreen,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.account_balance_wallet_outlined,
                  color: Colors.white,
                  size: 35,
                ),
                const SizedBox(height: 15),
                const Text(
                  "Today's Earnings",
                  style: TextStyle(color: Colors.white70, fontSize: 15),
                ),
                const SizedBox(height: 5),
                Text(
                  money(stats?.todayEarnings),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _buildEarningTile(
                title: 'Completed Orders',
                value: stats?.completedOrders.toString() ?? '—',
                icon: Icons.check_circle_outline,
              ),
              const SizedBox(width: 12),
              _buildEarningTile(
                title: 'Active Orders',
                value: stats?.activeOrders.toString() ?? '—',
                icon: Icons.local_shipping_outlined,
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Earnings Summary',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
              color: darkGreen,
            ),
          ),
          const SizedBox(height: 12),
          if (stats?.completedOrders == 0)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No completed deliveries yet. Earnings will appear here after a delivery is completed.',
                style: TextStyle(color: neutralText),
              ),
            ),
          _buildSummaryRow("Today's total", money(stats?.todayEarnings)),
          _buildSummaryRow('This week', money(stats?.weekEarnings)),
          _buildSummaryRow('This month', money(stats?.monthEarnings)),
          _buildSummaryRow('Cash to collect', money(stats?.cashToCollect)),
        ],
      ),
    );
  }
}
