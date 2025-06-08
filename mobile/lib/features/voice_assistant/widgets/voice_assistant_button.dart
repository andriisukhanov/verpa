import 'package:flutter/material.dart';
import 'dart:math' as math;

import '../../../core/theme/app_theme.dart';
import '../services/voice_assistant_service.dart';
import '../models/voice_command.dart';

class VoiceAssistantButton extends StatefulWidget {
  final String? aquariumId;
  final VoidCallback? onTap;

  const VoiceAssistantButton({
    super.key,
    this.aquariumId,
    this.onTap,
  });

  @override
  State<VoiceAssistantButton> createState() => _VoiceAssistantButtonState();
}

class _VoiceAssistantButtonState extends State<VoiceAssistantButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _pulseAnimation;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _pulseAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _initializeAssistant();
  }

  Future<void> _initializeAssistant() async {
    final initialized = await VoiceAssistantService.initialize(
      context: context,
      aquariumId: widget.aquariumId,
    );
    
    if (mounted) {
      setState(() {
        _isInitialized = initialized;
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (widget.onTap != null) {
      widget.onTap!();
    } else {
      _showVoiceAssistantDialog();
    }
  }

  void _showVoiceAssistantDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const VoiceAssistantDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<VoiceAssistantState>(
      stream: VoiceAssistantService.stateStream,
      initialData: VoiceAssistantService.currentState,
      builder: (context, snapshot) {
        final state = snapshot.data!;

        if (state.isListening) {
          _animationController.repeat();
        } else {
          _animationController.stop();
          _animationController.reset();
        }

        return GestureDetector(
          onTap: _isInitialized ? _handleTap : null,
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _isInitialized
                  ? (state.isListening ? AppTheme.primaryColor : AppTheme.secondaryColor)
                  : Colors.grey,
              boxShadow: [
                BoxShadow(
                  color: (state.isListening ? AppTheme.primaryColor : AppTheme.secondaryColor)
                      .withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (state.isListening)
                  AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (context, child) {
                      return Container(
                        width: 56 + (_pulseAnimation.value * 20),
                        height: 56 + (_pulseAnimation.value * 20),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.primaryColor.withOpacity(1 - _pulseAnimation.value),
                            width: 2,
                          ),
                        ),
                      );
                    },
                  ),
                AnimatedBuilder(
                  animation: _scaleAnimation,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: state.isListening ? _scaleAnimation.value : 1.0,
                      child: Icon(
                        state.isListening ? Icons.mic : Icons.mic_none,
                        color: Colors.white,
                        size: 28,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class VoiceAssistantDialog extends StatefulWidget {
  const VoiceAssistantDialog({super.key});

  @override
  State<VoiceAssistantDialog> createState() => _VoiceAssistantDialogState();
}

class _VoiceAssistantDialogState extends State<VoiceAssistantDialog>
    with TickerProviderStateMixin {
  late AnimationController _waveController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    );

    _fadeController.forward();
  }

  @override
  void dispose() {
    _waveController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: StreamBuilder<VoiceAssistantState>(
                stream: VoiceAssistantService.stateStream,
                initialData: VoiceAssistantService.currentState,
                builder: (context, snapshot) {
                  final state = snapshot.data!;

                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Voice Assistant',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 32),
                      
                      // Visualization
                      SizedBox(
                        height: 120,
                        child: state.isListening
                            ? _buildWaveAnimation()
                            : _buildIdleState(),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Status text
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: _buildStatusText(state),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Control button
                      _buildControlButton(state),
                      
                      const SizedBox(height: 24),
                      
                      // Suggestions or results
                      if (state.lastResult != null) ...[
                        _buildResultCard(state.lastResult!),
                        const SizedBox(height: 16),
                      ],
                      
                      if (state.lastResult?.suggestions != null) ...[
                        _buildSuggestions(state.lastResult!.suggestions!),
                        const SizedBox(height: 16),
                      ],
                      
                      // Error message
                      if (state.error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.errorColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: AppTheme.errorColor,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  state.error!,
                                  style: TextStyle(
                                    color: AppTheme.errorColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaveAnimation() {
    return AnimatedBuilder(
      animation: _waveController,
      builder: (context, child) {
        return CustomPaint(
          painter: WavePainter(
            animation: _waveController,
            color: AppTheme.primaryColor,
          ),
          child: Container(),
        );
      },
    );
  }

  Widget _buildIdleState() {
    return Center(
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.primaryColor.withOpacity(0.1),
        ),
        child: Icon(
          Icons.mic_none,
          size: 40,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  Widget _buildStatusText(VoiceAssistantState state) {
    String text;
    if (state.isListening) {
      text = state.currentText?.isNotEmpty == true
          ? '"${state.currentText}"'
          : 'Listening...';
    } else if (state.isProcessing) {
      text = 'Processing...';
    } else if (state.lastCommand != null) {
      text = 'Last command: "${state.lastCommand}"';
    } else {
      text = 'Tap the button to start';
    }

    return Text(
      text,
      key: ValueKey(text),
      style: TextStyle(
        fontSize: 16,
        color: state.isListening
            ? AppTheme.primaryColor
            : Theme.of(context).textTheme.bodyLarge?.color,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildControlButton(VoiceAssistantState state) {
    return GestureDetector(
      onTap: () {
        if (state.isListening) {
          VoiceAssistantService.stopListening();
        } else {
          VoiceAssistantService.startListening();
        }
      },
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: state.isListening ? AppTheme.errorColor : AppTheme.primaryColor,
          boxShadow: [
            BoxShadow(
              color: (state.isListening ? AppTheme.errorColor : AppTheme.primaryColor)
                  .withOpacity(0.3),
              blurRadius: 16,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Icon(
          state.isListening ? Icons.stop : Icons.mic,
          color: Colors.white,
          size: 48,
        ),
      ),
    );
  }

  Widget _buildResultCard(CommandResult result) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: result.success
            ? AppTheme.successColor.withOpacity(0.1)
            : AppTheme.errorColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: result.success
              ? AppTheme.successColor.withOpacity(0.3)
              : AppTheme.errorColor.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                result.success ? Icons.check_circle : Icons.error,
                color: result.success ? AppTheme.successColor : AppTheme.errorColor,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  result.message,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          if (result.data != null) ...[
            const SizedBox(height: 8),
            Text(
              result.data.toString(),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSuggestions(List<String> suggestions) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Try saying:',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: suggestions.map((suggestion) {
            return Chip(
              label: Text(
                suggestion,
                style: const TextStyle(fontSize: 12),
              ),
              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
              onDeleted: null,
            );
          }).toList(),
        ),
      ],
    );
  }
}

class WavePainter extends CustomPainter {
  final Animation<double> animation;
  final Color color;

  WavePainter({
    required this.animation,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    final path = Path();
    const amplitude = 20.0;
    const frequency = 2.0;
    final phase = animation.value * 2 * math.pi;

    path.moveTo(0, size.height / 2);

    for (double x = 0; x <= size.width; x++) {
      final y = size.height / 2 +
          amplitude * math.sin((x / size.width * frequency * 2 * math.pi) + phase);
      path.lineTo(x, y);
    }

    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();

    canvas.drawPath(path, paint);

    // Second wave
    paint.color = color.withOpacity(0.2);
    final path2 = Path();
    final phase2 = phase + math.pi / 2;

    path2.moveTo(0, size.height / 2);

    for (double x = 0; x <= size.width; x++) {
      final y = size.height / 2 +
          amplitude * 0.7 * math.sin((x / size.width * frequency * 2 * math.pi) + phase2);
      path2.lineTo(x, y);
    }

    path2.lineTo(size.width, size.height);
    path2.lineTo(0, size.height);
    path2.close();

    canvas.drawPath(path2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}