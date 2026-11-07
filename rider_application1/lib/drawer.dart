import 'dart:io';

import 'package:flutter/material.dart';
import 'cafe_theme.dart';
import 'logout.dart';
import 'rider_api_service.dart';

class DrawerPage extends StatelessWidget {
  final String riderName;
  final String riderEmail;
  final String riderPhone;
  final String? profileImagePath;
  final RiderApiService apiService;

  const DrawerPage({
    super.key,
    required this.riderName,
    required this.riderEmail,
    required this.riderPhone,
    required this.apiService,
    this.profileImagePath,
  });

  @override
  Widget build(BuildContext context) {
    ImageProvider? profileImage;

    if (profileImagePath != null && profileImagePath!.trim().isNotEmpty) {
      final String path = profileImagePath!.trim();

      if (path.startsWith('http://') || path.startsWith('https://')) {
        profileImage = NetworkImage(path);
      } else if (path.startsWith('assets/')) {
        profileImage = AssetImage(path);
      } else {
        profileImage = FileImage(File(path));
      }
    }

    return Drawer(
      backgroundColor: creamBackground,
      child: Column(
        children: [
          // Rider information
          UserAccountsDrawerHeader(
            accountName: Text(
              riderName.isNotEmpty ? riderName : 'Rider',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(
              riderEmail.isNotEmpty ? riderEmail : 'No email provided',
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              backgroundImage: profileImage,
              child: profileImage == null
                  ? const Icon(
                      Icons.account_circle,
                      size: 60,
                      color: primaryOrange,
                    )
                  : null,
            ),
            decoration: const BoxDecoration(color: primaryOrange),
          ),

          // Rider phone number
          ListTile(
            leading: const Icon(Icons.phone, color: primaryOrange),
            title: const Text('Phone Number'),
            subtitle: Text(riderPhone.isNotEmpty ? riderPhone : 'Not provided'),
          ),

          const Divider(),

          // Drawer menu options
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                const Divider(),

                ListTile(
                  leading: const Icon(Icons.logout, color: primaryOrange),
                  title: const Text('Logout'),
                  onTap: () {
                    Navigator.of(context).pop();

                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => PageNew9(apiService: apiService),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
