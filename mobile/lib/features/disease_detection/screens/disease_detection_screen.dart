import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/disease_detection_result.dart';
import '../models/disease_database.dart';
import '../services/disease_detection_service.dart';
import '../widgets/disease_result_card.dart';
import '../widgets/health_score_widget.dart';

class DiseaseDetectionScreen extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;

  const DiseaseDetectionScreen({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
  });

  @override
  State<DiseaseDetectionScreen> createState() => _DiseaseDetectionScreenState();
}

class _DiseaseDetectionScreenState extends State<DiseaseDetectionScreen> {
  File? _selectedImage;
  DiseaseDetectionResult? _analysisResult;
  List<DiseaseDetectionResult> _previousResults = [];
  bool _isLoading = false;
  bool _isAnalyzing = false;

  @override
  void initState() {
    super.initState();
    _loadPreviousResults();
  }

  Future<void> _loadPreviousResults() async {
    setState(() => _isLoading = true);
    
    try {
      final results = await DiseaseDetectionService.getResults(widget.aquariumId);
      setState(() {
        _previousResults = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final file = await DiseaseDetectionService.pickImage(source);
      if (file != null) {
        setState(() {
          _selectedImage = file;
          _analysisResult = null;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to pick image: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _analyzeImage() async {
    if (_selectedImage == null) return;
    
    setState(() => _isAnalyzing = true);
    
    try {
      final result = await DiseaseDetectionService.analyzeImage(
        imageFile: _selectedImage!,
        aquariumId: widget.aquariumId,
      );
      
      setState(() {
        _analysisResult = result;
        _isAnalyzing = false;
      });
      
      // Reload previous results
      _loadPreviousResults();
    } catch (e) {
      setState(() => _isAnalyzing = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Analysis failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Disease Detection - ${widget.aquariumName}'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              context.push('/disease-history/${widget.aquariumId}');
            },
          ),
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _showDiseaseGuide,
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Image Selection Area
              _buildImageSection(),
              
              const SizedBox(height: 24),
              
              // Analysis Button
              if (_selectedImage != null && _analysisResult == null)
                CustomButton(
                  text: 'Analyze Fish Health',
                  icon: Icons.biotech,
                  onPressed: _analyzeImage,
                  isLoading: _isAnalyzing,
                ),
              
              // Analysis Result
              if (_analysisResult != null) ...[
                const SizedBox(height: 24),
                _buildResultSection(),
              ],
              
              // Previous Results
              if (_previousResults.isNotEmpty && _analysisResult == null) ...[
                const SizedBox(height: 32),
                _buildPreviousResults(),
              ],
              
              // Prevention Tips
              const SizedBox(height: 32),
              _buildPreventionTips(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImageSection() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_selectedImage == null) ...[
              Icon(
                Icons.add_a_photo,
                size: 64,
                color: AppTheme.greyColor,
              ),
              const SizedBox(height: 16),
              Text(
                'Take or select a clear photo of your fish',
                style: TextStyle(
                  fontSize: 16,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Make sure the fish is clearly visible and well-lit',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Camera',
                      icon: Icons.camera_alt,
                      variant: ButtonVariant.outline,
                      onPressed: () => _pickImage(ImageSource.camera),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: 'Gallery',
                      icon: Icons.photo_library,
                      variant: ButtonVariant.outline,
                      onPressed: () => _pickImage(ImageSource.gallery),
                    ),
                  ),
                ],
              ),
            ] else ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  children: [
                    Image.file(
                      _selectedImage!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: 300,
                    ),
                    if (_isAnalyzing)
                      Positioned.fill(
                        child: Container(
                          color: Colors.black54,
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Analyzing image...',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CustomButton(
                text: 'Select Different Image',
                icon: Icons.refresh,
                variant: ButtonVariant.outline,
                size: ButtonSize.small,
                onPressed: () {
                  setState(() {
                    _selectedImage = null;
                    _analysisResult = null;
                  });
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResultSection() {
    if (_analysisResult == null) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Health Score
        HealthScoreWidget(
          score: _analysisResult!.overallHealth.score,
          status: _analysisResult!.overallHealth.status,
          summary: _analysisResult!.overallHealth.summary,
        ),
        
        const SizedBox(height: 16),
        
        // Detected Diseases
        if (_analysisResult!.detectedDiseases.isNotEmpty) ...[
          Text(
            'Detected Issues',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ..._analysisResult!.detectedDiseases.map((disease) => 
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DiseaseResultCard(
                disease: disease,
                onViewDetails: () {
                  context.push(
                    '/disease-details/${_analysisResult!.id}',
                    extra: _analysisResult,
                  );
                },
              ),
            ),
          ),
        ],
        
        // Action Buttons
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: CustomButton(
                text: 'View Full Report',
                icon: Icons.description,
                onPressed: () {
                  context.push(
                    '/disease-details/${_analysisResult!.id}',
                    extra: _analysisResult,
                  );
                },
              ),
            ),
            if (_analysisResult!.hasDisease) ...[
              const SizedBox(width: 12),
              Expanded(
                child: CustomButton(
                  text: 'Start Treatment',
                  icon: Icons.medical_services,
                  variant: ButtonVariant.primary,
                  onPressed: () {
                    context.push(
                      '/disease-treatment/${_analysisResult!.id}',
                      extra: _analysisResult,
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildPreviousResults() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Analyses',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                context.push('/disease-history/${widget.aquariumId}');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _previousResults.take(5).length,
            itemBuilder: (context, index) {
              final result = _previousResults[index];
              return Padding(
                padding: EdgeInsets.only(
                  right: index < 4 ? 12 : 0,
                ),
                child: _buildPreviousResultCard(result),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPreviousResultCard(DiseaseDetectionResult result) {
    final hasDisease = result.hasDisease;
    final color = hasDisease ? AppTheme.errorColor : AppTheme.successColor;
    
    return InkWell(
      onTap: () {
        context.push(
          '/disease-details/${result.id}',
          extra: result,
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withOpacity(0.3),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              hasDisease ? Icons.warning : Icons.check_circle,
              color: color,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              hasDisease ? 'Disease\nDetected' : 'Healthy',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              _formatDate(result.analyzedAt),
              style: TextStyle(
                fontSize: 10,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreventionTips() {
    return Card(
      color: AppTheme.primaryColor.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.shield,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Prevention Tips',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...DiseaseDatabase.preventiveMeasures.take(3).map((measure) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.check_circle,
                      size: 16,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        measure.title,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _showDiseaseGuide,
                child: const Text('View Disease Guide'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDiseaseGuide() {
    context.push('/disease-guide');
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}';
    }
  }
}