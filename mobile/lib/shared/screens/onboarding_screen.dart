import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lottie/lottie.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/storage/storage_service.dart';
import '../../core/localization/app_localizations.dart';
import '../widgets/custom_button.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  final StorageService _storageService = StorageService();
  
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    ));
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  List<OnboardingPage> _getPages(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return [
      OnboardingPage(
        title: l10n?.get('onboarding_welcome_title') ?? 'Welcome to Verpa',
        description: l10n?.get('onboarding_welcome_desc') ?? 
          'Your comprehensive aquarium management companion. Monitor, track, and optimize your aquatic environments with ease.',
        image: 'assets/animations/welcome.json',
        iconData: Icons.waves,
        backgroundColor: AppTheme.primaryColor,
      ),
      OnboardingPage(
        title: l10n?.get('onboarding_monitor_title') ?? 'Monitor Water Quality',
        description: l10n?.get('onboarding_monitor_desc') ?? 
          'Keep track of essential water parameters like pH, temperature, ammonia, and nitrites to ensure a healthy environment.',
        image: 'assets/animations/water_quality.json',
        iconData: Icons.water_drop,
        backgroundColor: AppTheme.secondaryColor,
      ),
      OnboardingPage(
        title: l10n?.get('onboarding_track_title') ?? 'Track Your Fish',
        description: l10n?.get('onboarding_track_desc') ?? 
          'Catalog your aquatic inhabitants, monitor their health, and receive personalized care recommendations.',
        image: 'assets/animations/fish_tracking.json',
        iconData: Icons.pets,
        backgroundColor: AppTheme.accentColor,
      ),
      OnboardingPage(
        title: l10n?.get('onboarding_equipment_title') ?? 'Equipment Management',
        description: l10n?.get('onboarding_equipment_desc') ?? 
          'Manage your aquarium equipment, schedule maintenance, and get reminded when it\'s time for replacements.',
        image: 'assets/animations/equipment.json',
        iconData: Icons.settings,
        backgroundColor: AppTheme.successColor,
      ),
      OnboardingPage(
        title: l10n?.get('onboarding_analytics_title') ?? 'Smart Analytics',
        description: l10n?.get('onboarding_analytics_desc') ?? 
          'Get insights into your aquarium\'s trends, health scores, and receive AI-powered recommendations.',
        image: 'assets/animations/analytics.json',
        iconData: Icons.analytics,
        backgroundColor: AppTheme.infoColor,
      ),
      OnboardingPage(
        title: l10n?.get('onboarding_ready_title') ?? 'Ready to Dive In?',
        description: l10n?.get('onboarding_ready_desc') ?? 
          'Create your account and start your journey to becoming a master aquarist. Your fish will thank you!',
        image: 'assets/animations/ready.json',
        iconData: Icons.rocket_launch,
        backgroundColor: AppTheme.primaryColor,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final pages = _getPages(context);
    
    return Scaffold(
      body: Stack(
        children: [
          // Animated Background
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  pages[_currentPage].backgroundColor,
                  pages[_currentPage].backgroundColor.withOpacity(0.7),
                ],
              ),
            ),
          ),
          
          // Page View
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
              _animationController.reset();
              _animationController.forward();
            },
            itemCount: pages.length,
            itemBuilder: (context, index) {
              return _buildPage(pages[index], index);
            },
          ),
          
          // Top Skip Button
          if (_currentPage < pages.length - 1)
            Positioned(
              top: 50,
              right: 24,
              child: TextButton(
                onPressed: _completeOnboarding,
                child: Text(
                  AppLocalizations.of(context)?.get('skip') ?? 'Skip',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          
          // Bottom Navigation
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
              child: Column(
                children: [
                  // Page Indicators
                  SmoothPageIndicator(
                    controller: _pageController,
                    count: pages.length,
                    effect: ExpandingDotsEffect(
                      activeDotColor: Colors.white,
                      dotColor: Colors.white.withOpacity(0.3),
                      dotHeight: 8,
                      dotWidth: 8,
                      expansionFactor: 3,
                      spacing: 8,
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Navigation Buttons
                  _buildNavigationButtons(pages.length),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPage(OnboardingPage page, int index) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 180),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Lottie Animation or Icon
                SizedBox(
                  height: 280,
                  child: _buildPageImage(page),
                ),
                
                const SizedBox(height: 48),
                
                // Title
                Text(
                  page.title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 24),
                
                // Description
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    page.description,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withOpacity(0.9),
                      height: 1.5,
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPageImage(OnboardingPage page) {
    // Try to load Lottie animation, fallback to icon if not available
    try {
      return Lottie.asset(
        page.image,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) {
          return _buildIconFallback(page.iconData);
        },
      );
    } catch (e) {
      return _buildIconFallback(page.iconData);
    }
  }

  Widget _buildIconFallback(IconData icon) {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        size: 100,
        color: Colors.white,
      ),
    );
  }

  Widget _buildNavigationButtons(int pageCount) {
    final isLastPage = _currentPage == pageCount - 1;
    final l10n = AppLocalizations.of(context);
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Previous Button
        if (_currentPage > 0)
          IconButton(
            onPressed: () {
              _pageController.previousPage(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
              );
            },
            icon: const Icon(Icons.arrow_back_ios),
            color: Colors.white,
            iconSize: 24,
          )
        else
          const SizedBox(width: 48),
        
        // Next/Get Started Button
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: CustomButton(
              text: isLastPage 
                ? (l10n?.get('get_started') ?? 'Get Started')
                : (l10n?.get('next') ?? 'Next'),
              onPressed: () {
                if (isLastPage) {
                  _completeOnboarding();
                } else {
                  _pageController.nextPage(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                  );
                }
              },
              variant: ButtonVariant.primary,
              backgroundColor: Colors.white,
              textColor: pages[_currentPage].backgroundColor,
            ),
          ),
        ),
        
        // Placeholder for alignment
        if (_currentPage < pageCount - 1)
          const SizedBox(width: 48)
        else
          const SizedBox(width: 48),
      ],
    );
  }

  Future<void> _completeOnboarding() async {
    await _storageService.setOnboardingComplete(true);
    if (mounted) {
      context.go(AppConstants.loginRoute);
    }
  }
}

class OnboardingPage {
  final String title;
  final String description;
  final String image;
  final IconData iconData;
  final Color backgroundColor;

  const OnboardingPage({
    required this.title,
    required this.description,
    required this.image,
    required this.iconData,
    required this.backgroundColor,
  });
}