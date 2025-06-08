import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';

import '../../core/theme/app_theme.dart';
import '../../core/localization/app_localizations.dart';

class TutorialService {
  static const String _tutorialPrefix = 'verpa_tutorial_';
  
  // Tutorial keys
  static const String dashboardTutorial = 'dashboard';
  static const String aquariumDetailTutorial = 'aquarium_detail';
  static const String addAquariumTutorial = 'add_aquarium';
  static const String waterParametersTutorial = 'water_parameters';
  static const String equipmentTutorial = 'equipment';
  static const String inhabitantsTutorial = 'inhabitants';
  static const String maintenanceTutorial = 'maintenance';
  static const String diseaseDetectionTutorial = 'disease_detection';
  static const String expensesTutorial = 'expenses';
  static const String socialTutorial = 'social';

  static Future<bool> shouldShowTutorial(String tutorialKey) async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool('$_tutorialPrefix$tutorialKey') ?? false);
  }

  static Future<void> markTutorialComplete(String tutorialKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_tutorialPrefix$tutorialKey', true);
  }

  static Future<void> resetAllTutorials() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((key) => key.startsWith(_tutorialPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  static void showDashboardTutorial(
    BuildContext context, {
    required GlobalKey addAquariumKey,
    required GlobalKey bottomNavKey,
    required GlobalKey profileKey,
    VoidCallback? onComplete,
  }) async {
    if (!await shouldShowTutorial(dashboardTutorial)) return;

    final l10n = AppLocalizations.of(context);
    final targets = <TargetFocus>[
      TargetFocus(
        identify: "addAquarium",
        keyTarget: addAquariumKey,
        shape: ShapeLightFocus.RRect,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.bottom,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_add_aquarium_title') ?? 'Add Your First Aquarium',
                description: l10n?.get('tutorial_add_aquarium_desc') ?? 
                  'Tap here to create your first aquarium. You can add multiple aquariums and manage them separately.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
              );
            },
          ),
        ],
      ),
      TargetFocus(
        identify: "bottomNav",
        keyTarget: bottomNavKey,
        shape: ShapeLightFocus.RRect,
        radius: 0,
        contents: [
          TargetContent(
            align: ContentAlign.top,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_navigation_title') ?? 'Navigate Your App',
                description: l10n?.get('tutorial_navigation_desc') ?? 
                  'Use the bottom navigation to access different sections: Dashboard, Community, and Settings.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
              );
            },
          ),
        ],
      ),
      TargetFocus(
        identify: "profile",
        keyTarget: profileKey,
        shape: ShapeLightFocus.Circle,
        contents: [
          TargetContent(
            align: ContentAlign.bottom,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_profile_title') ?? 'Your Profile',
                description: l10n?.get('tutorial_profile_desc') ?? 
                  'Access your profile, subscription status, and app settings from here.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
                isLast: true,
              );
            },
          ),
        ],
      ),
    ];

    TutorialCoachMark(
      targets: targets,
      colorShadow: Colors.black87,
      paddingFocus: 10,
      hideSkip: false,
      onFinish: () async {
        await markTutorialComplete(dashboardTutorial);
        onComplete?.call();
      },
      onSkip: () async {
        await markTutorialComplete(dashboardTutorial);
        onComplete?.call();
        return true;
      },
    ).show(context: context);
  }

  static void showAquariumDetailTutorial(
    BuildContext context, {
    required GlobalKey parametersKey,
    required GlobalKey equipmentKey,
    required GlobalKey inhabitantsKey,
    required GlobalKey maintenanceKey,
    VoidCallback? onComplete,
  }) async {
    if (!await shouldShowTutorial(aquariumDetailTutorial)) return;

    final l10n = AppLocalizations.of(context);
    final targets = <TargetFocus>[
      TargetFocus(
        identify: "parameters",
        keyTarget: parametersKey,
        shape: ShapeLightFocus.RRect,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.bottom,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_parameters_title') ?? 'Water Parameters',
                description: l10n?.get('tutorial_parameters_desc') ?? 
                  'Monitor and record your water parameters here. Keep track of pH, temperature, and other important values.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
              );
            },
          ),
        ],
      ),
      TargetFocus(
        identify: "equipment",
        keyTarget: equipmentKey,
        shape: ShapeLightFocus.RRect,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.bottom,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_equipment_title') ?? 'Equipment Management',
                description: l10n?.get('tutorial_equipment_desc') ?? 
                  'Track your aquarium equipment, warranties, and maintenance schedules.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
              );
            },
          ),
        ],
      ),
      TargetFocus(
        identify: "inhabitants",
        keyTarget: inhabitantsKey,
        shape: ShapeLightFocus.RRect,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.top,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_inhabitants_title') ?? 'Your Fish & Plants',
                description: l10n?.get('tutorial_inhabitants_desc') ?? 
                  'Keep a detailed record of all your aquarium inhabitants, their health, and care requirements.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
              );
            },
          ),
        ],
      ),
      TargetFocus(
        identify: "maintenance",
        keyTarget: maintenanceKey,
        shape: ShapeLightFocus.RRect,
        radius: 8,
        contents: [
          TargetContent(
            align: ContentAlign.top,
            builder: (context, controller) {
              return _buildTutorialCard(
                title: l10n?.get('tutorial_maintenance_title') ?? 'Maintenance Tasks',
                description: l10n?.get('tutorial_maintenance_desc') ?? 
                  'Schedule and track maintenance tasks like water changes, filter cleaning, and more.',
                onNext: () => controller.next(),
                onSkip: () => controller.skip(),
                isLast: true,
              );
            },
          ),
        ],
      ),
    ];

    TutorialCoachMark(
      targets: targets,
      colorShadow: Colors.black87,
      paddingFocus: 10,
      hideSkip: false,
      onFinish: () async {
        await markTutorialComplete(aquariumDetailTutorial);
        onComplete?.call();
      },
      onSkip: () async {
        await markTutorialComplete(aquariumDetailTutorial);
        onComplete?.call();
        return true;
      },
    ).show(context: context);
  }

  static Widget _buildTutorialCard({
    required String title,
    required String description,
    required VoidCallback onNext,
    required VoidCallback onSkip,
    bool isLast = false,
  }) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 300),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: onSkip,
                    child: Text(
                      'Skip',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: onNext,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      isLast ? 'Done' : 'Next',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Helper method to show a quick tooltip
  static void showQuickTip(
    BuildContext context,
    GlobalKey targetKey,
    String title,
    String description,
  ) {
    final target = TargetFocus(
      identify: "quickTip",
      keyTarget: targetKey,
      shape: ShapeLightFocus.RRect,
      radius: 8,
      contents: [
        TargetContent(
          align: ContentAlign.bottom,
          builder: (context, controller) {
            return _buildTutorialCard(
              title: title,
              description: description,
              onNext: () => controller.next(),
              onSkip: () => controller.skip(),
              isLast: true,
            );
          },
        ),
      ],
    );

    TutorialCoachMark(
      targets: [target],
      colorShadow: Colors.black87,
      paddingFocus: 10,
      hideSkip: true,
    ).show(context: context);
  }
}