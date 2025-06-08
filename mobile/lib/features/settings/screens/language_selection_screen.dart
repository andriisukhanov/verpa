import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/language_provider.dart';

class LanguageSelectionScreen extends StatelessWidget {
  const LanguageSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final localizations = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.get('language')),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: ListView.builder(
        itemCount: AppLocales.supportedLocales.length,
        itemBuilder: (context, index) {
          final locale = AppLocales.supportedLocales[index];
          final isSelected = languageProvider.isCurrentLanguage(locale.languageCode);
          
          return ListTile(
            leading: Text(
              AppLocales.getFlag(locale.languageCode),
              style: const TextStyle(fontSize: 28),
            ),
            title: Text(
              AppLocales.getLanguageName(locale.languageCode),
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            trailing: isSelected
                ? Icon(
                    Icons.check_circle,
                    color: AppTheme.primaryColor,
                  )
                : null,
            onTap: () async {
              await languageProvider.changeLanguage(locale);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Language changed to ${AppLocales.getLanguageName(locale.languageCode)}',
                    ),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
                context.pop();
              }
            },
          );
        },
      ),
    );
  }
}