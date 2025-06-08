import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../aquarium/models/water_parameters.dart';
import '../../aquarium/services/parameter_service.dart';
import '../models/test_strip_result.dart';

class WaterTestResultsScreen extends StatefulWidget {
  final String aquariumId;
  final TestStripResult result;

  const WaterTestResultsScreen({
    super.key,
    required this.aquariumId,
    required this.result,
  });

  @override
  State<WaterTestResultsScreen> createState() => _WaterTestResultsScreenState();
}

class _WaterTestResultsScreenState extends State<WaterTestResultsScreen> {
  bool _isSaving = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Strip Results'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: _showHelpDialog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Confidence indicator
            _buildConfidenceIndicator(),
            
            // Test strip image
            _buildTestStripImage(),
            
            // Results
            _buildResultsList(),
            
            // Warnings
            if (widget.result.warnings.isNotEmpty)
              _buildWarnings(),
            
            // Action buttons
            _buildActionButtons(),
            
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildConfidenceIndicator() {
    final confidence = widget.result.confidence;
    final color = confidence >= 0.8
        ? AppTheme.successColor
        : confidence >= 0.6
            ? AppTheme.warningColor
            : AppTheme.errorColor;

    return Container(
      padding: const EdgeInsets.all(16),
      color: color.withOpacity(0.1),
      child: Row(
        children: [
          Icon(
            confidence >= 0.8
                ? Icons.check_circle
                : confidence >= 0.6
                    ? Icons.warning
                    : Icons.error,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Analysis Confidence: ${(confidence * 100).toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  confidence >= 0.8
                      ? 'High confidence in results'
                      : confidence >= 0.6
                          ? 'Moderate confidence - verify unusual readings'
                          : 'Low confidence - consider retesting',
                  style: TextStyle(
                    fontSize: 12,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestStripImage() {
    return Container(
      height: 200,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.file(
              File(widget.result.imagePath),
              fit: BoxFit.contain,
            ),
            // Overlay regions if available
            if (widget.result.metadata['regionsDetected'] != null)
              CustomPaint(
                painter: RegionOverlayPainter(widget.result),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsList() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Detected Parameters',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ...widget.result.readings.entries.map((entry) {
            return _buildParameterCard(entry.key, entry.value);
          }),
        ],
      ),
    );
  }

  Widget _buildParameterCard(String parameter, ParameterReading reading) {
    final paramInfo = WaterParameterPresets.all.firstWhere(
      (p) => p.key == parameter,
      orElse: () => WaterParameterPresets.ph,
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  paramInfo.icon,
                  color: reading.isInRange
                      ? AppTheme.successColor
                      : AppTheme.errorColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    paramInfo.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: reading.isInRange
                        ? AppTheme.successColor.withOpacity(0.1)
                        : AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: reading.isInRange
                          ? AppTheme.successColor.withOpacity(0.3)
                          : AppTheme.errorColor.withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    reading.isInRange ? 'Normal' : 'Out of Range',
                    style: TextStyle(
                      color: reading.isInRange
                          ? AppTheme.successColor
                          : AppTheme.errorColor,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Detected Value',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${reading.value}${reading.unit.isNotEmpty ? ' ${reading.unit}' : ''}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Color Match',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: reading.detectedColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.grey),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${(reading.confidence * 100).toStringAsFixed(0)}%',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            if (paramInfo.optimalRange != null) ...[
              const SizedBox(height: 12),
              _buildRangeIndicator(reading.value, paramInfo.optimalRange!),
              const SizedBox(height: 8),
              Text(
                'Optimal: ${paramInfo.optimalRange!.min} - ${paramInfo.optimalRange!.max}${reading.unit.isNotEmpty ? ' ${reading.unit}' : ''}',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
            if (reading.colorMatches.length > 1) ...[
              const SizedBox(height: 12),
              Text(
                'Color Matches',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: reading.colorMatches.take(3).map((match) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Column(
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: match.referenceColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.grey),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${match.value}',
                          style: const TextStyle(fontSize: 10),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRangeIndicator(double value, ParameterRange range) {
    final normalizedValue = ((value - range.min) / (range.max - range.min))
        .clamp(0.0, 1.0);

    return Stack(
      children: [
        Container(
          height: 8,
          decoration: BoxDecoration(
            color: Colors.grey[300],
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        FractionallySizedBox(
          widthFactor: normalizedValue,
          child: Container(
            height: 8,
            decoration: BoxDecoration(
              color: value >= range.min && value <= range.max
                  ? AppTheme.successColor
                  : AppTheme.errorColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWarnings() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.warningColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.warningColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning, color: AppTheme.warningColor),
              const SizedBox(width: 8),
              const Text(
                'Analysis Warnings',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...widget.result.warnings.map((warning) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                Expanded(child: Text(warning)),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          CustomButton(
            text: 'Save to Aquarium',
            icon: Icons.save,
            isLoading: _isSaving,
            onPressed: widget.result.isReliable ? _saveResults : null,
          ),
          const SizedBox(height: 12),
          CustomButton(
            text: 'Retake Test',
            icon: Icons.refresh,
            variant: ButtonVariant.outline,
            onPressed: () {
              Navigator.pop(context);
            },
          ),
          const SizedBox(height: 12),
          CustomButton(
            text: 'Manual Entry',
            icon: Icons.edit,
            variant: ButtonVariant.text,
            onPressed: () {
              context.push('/record-parameters/${widget.aquariumId}');
            },
          ),
        ],
      ),
    );
  }

  Future<void> _saveResults() async {
    setState(() {
      _isSaving = true;
    });

    try {
      // Convert test strip results to water parameters
      final parameters = WaterParameters(
        temperature: null, // Not available from test strip
        ph: widget.result.readings['ph']?.value,
        ammonia: widget.result.readings['ammonia']?.value,
        nitrite: widget.result.readings['nitrite']?.value,
        nitrate: widget.result.readings['nitrate']?.value,
        salinity: widget.result.readings['salinity']?.value,
        alkalinity: widget.result.readings['alkalinity']?.value ??
            widget.result.readings['kh']?.value,
        calcium: widget.result.readings['calcium']?.value,
        magnesium: null, // Not typically on test strips
        phosphate: null, // Not typically on test strips
        recordedAt: widget.result.testedAt,
        notes: 'Recorded via test strip scanner',
      );

      await ParameterService.saveParameters(widget.aquariumId, parameters);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Parameters saved successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        
        // Navigate to aquarium detail
        context.go('/dashboard/aquarium/${widget.aquariumId}');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save parameters: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isSaving = false;
      });
    }
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Understanding Results'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Confidence Score:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• 80%+ High confidence, results are reliable\n'
                '• 60-79% Moderate confidence, verify unusual readings\n'
                '• <60% Low confidence, consider retesting',
              ),
              SizedBox(height: 16),
              Text(
                'Color Matching:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'The app matches the detected colors to reference charts. '
                'Multiple possible matches are shown with their confidence levels.',
              ),
              SizedBox(height: 16),
              Text(
                'Tips for Better Results:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Use natural or bright white light\n'
                '• Place strip on white background\n'
                '• Scan within time specified on test kit\n'
                '• Keep strip flat and in focus',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}

class RegionOverlayPainter extends CustomPainter {
  final TestStripResult result;

  RegionOverlayPainter(this.result);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..color = Colors.green;

    // Draw bounding boxes for detected regions
    // This would require region data from the analysis
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}