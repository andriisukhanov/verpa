import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lottie/lottie.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/constants/app_constants.dart';
import '../../../shared/services/biometric_service.dart';
import '../../../shared/widgets/custom_button.dart';

class BiometricAuthScreen extends StatefulWidget {
  final String? redirectTo;
  
  const BiometricAuthScreen({
    super.key,
    this.redirectTo,
  });

  @override
  State<BiometricAuthScreen> createState() => _BiometricAuthScreenState();
}

class _BiometricAuthScreenState extends State<BiometricAuthScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  
  bool _isAuthenticating = false;
  String _biometricType = '';
  IconData _biometricIcon = Icons.fingerprint;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _loadBiometricInfo();
    _authenticateWithBiometric();
  }

  void _setupAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.5, curve: Curves.elasticOut),
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.3, curve: Curves.easeIn),
    ));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadBiometricInfo() async {
    final type = await BiometricService.getBiometricTypeName(context);
    final icon = await BiometricService.getBiometricIcon();
    
    setState(() {
      _biometricType = type;
      _biometricIcon = icon;
    });
  }

  Future<void> _authenticateWithBiometric() async {
    if (_isAuthenticating) return;
    
    setState(() => _isAuthenticating = true);
    
    final l10n = AppLocalizations.of(context);
    final authenticated = await BiometricService.authenticate(
      reason: l10n?.get('biometric_auth_reason') ?? 
        'Authenticate to access Verpa',
    );

    setState(() => _isAuthenticating = false);

    if (authenticated && mounted) {
      // Add success animation
      _animationController.reverse().then((_) {
        context.go(widget.redirectTo ?? AppConstants.dashboardRoute);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.backgroundDark : AppTheme.backgroundLight,
      body: SafeArea(
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: Icon(
                        Icons.waves,
                        size: 50,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    
                    const SizedBox(height: 48),
                    
                    // Biometric Icon with Animation
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Ripple effect
                        if (_isAuthenticating)
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0.0, end: 1.0),
                            duration: const Duration(seconds: 2),
                            builder: (context, value, child) {
                              return Container(
                                width: 150 + (50 * value),
                                height: 150 + (50 * value),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppTheme.primaryColor.withOpacity(1 - value),
                                    width: 2,
                                  ),
                                ),
                              );
                            },
                          ),
                        
                        // Main icon
                        Container(
                          width: 150,
                          height: 150,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _biometricIcon,
                            size: 80,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 48),
                    
                    // Title
                    Text(
                      l10n?.get('biometric_auth_title') ?? 'Unlock Verpa',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Subtitle
                    Text(
                      '${l10n?.get('use_your') ?? 'Use your'} $_biometricType',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: isDark ? AppTheme.textSecondaryDark : AppTheme.textSecondaryLight,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    
                    const SizedBox(height: 48),
                    
                    // Action Buttons
                    if (!_isAuthenticating) ...[
                      CustomButton(
                        text: l10n?.get('try_again') ?? 'Try Again',
                        icon: _biometricIcon,
                        onPressed: _authenticateWithBiometric,
                      ),
                      
                      const SizedBox(height: 16),
                      
                      TextButton(
                        onPressed: () {
                          context.go(AppConstants.loginRoute);
                        },
                        child: Text(
                          l10n?.get('use_password') ?? 'Use Password Instead',
                        ),
                      ),
                    ] else ...[
                      CircularProgressIndicator(
                        color: AppTheme.primaryColor,
                      ),
                      
                      const SizedBox(height: 24),
                      
                      Text(
                        l10n?.get('authenticating') ?? 'Authenticating...',
                        style: theme.textTheme.bodyLarge,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}