import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/disease_database.dart';
import '../widgets/disease_guide_card.dart';

class DiseaseGuideScreen extends StatefulWidget {
  final String? selectedDiseaseId;

  const DiseaseGuideScreen({
    super.key,
    this.selectedDiseaseId,
  });

  @override
  State<DiseaseGuideScreen> createState() => _DiseaseGuideScreenState();
}

class _DiseaseGuideScreenState extends State<DiseaseGuideScreen> {
  final _searchController = TextEditingController();
  List<DiseaseInfo> _filteredDiseases = [];
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Parasitic',
    'Bacterial',
    'Fungal',
    'Viral',
  ];

  @override
  void initState() {
    super.initState();
    _filteredDiseases = DiseaseDatabase.diseases.values.toList();
    
    // If a specific disease was selected, scroll to it
    if (widget.selectedDiseaseId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // TODO: Implement scroll to specific disease
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterDiseases() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredDiseases = DiseaseDatabase.diseases.values.where((disease) {
        final matchesSearch = query.isEmpty ||
            disease.name.toLowerCase().contains(query) ||
            disease.scientificName.toLowerCase().contains(query) ||
            disease.symptoms.any((s) => s.toLowerCase().contains(query));
        
        final matchesCategory = _selectedCategory == 'All' ||
            _getCategoryForDisease(disease) == _selectedCategory;
        
        return matchesSearch && matchesCategory;
      }).toList();
    });
  }

  String _getCategoryForDisease(DiseaseInfo disease) {
    // Simple categorization based on disease type
    if (disease.id == 'ich' || disease.id == 'velvet') return 'Parasitic';
    if (disease.id == 'fin_rot' || disease.id == 'dropsy') return 'Bacterial';
    if (disease.id == 'fungal_infection') return 'Fungal';
    return 'Other';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fish Disease Guide'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _showPreventionGuide,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and Filter
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                CustomTextField(
                  controller: _searchController,
                  hintText: 'Search diseases, symptoms...',
                  prefixIcon: Icons.search,
                  onChanged: (_) => _filterDiseases(),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final category = _categories[index];
                      final isSelected = _selectedCategory == category;
                      
                      return Padding(
                        padding: EdgeInsets.only(
                          right: index < _categories.length - 1 ? 8 : 0,
                        ),
                        child: FilterChip(
                          label: Text(category),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              _selectedCategory = category;
                              _filterDiseases();
                            });
                          },
                          backgroundColor: AppTheme.greyColor.withOpacity(0.1),
                          selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                          checkmarkColor: AppTheme.primaryColor,
                          labelStyle: TextStyle(
                            color: isSelected 
                                ? AppTheme.primaryColor 
                                : AppTheme.textSecondary,
                            fontWeight: isSelected 
                                ? FontWeight.bold 
                                : FontWeight.normal,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          // Disease List
          Expanded(
            child: _filteredDiseases.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredDiseases.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _buildHeader();
                      }
                      
                      final disease = _filteredDiseases[index - 1];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: DiseaseGuideCard(
                          disease: disease,
                          isHighlighted: disease.id == widget.selectedDiseaseId,
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/disease-detection/select-aquarium');
        },
        backgroundColor: AppTheme.secondaryColor,
        icon: const Icon(Icons.camera_alt),
        label: const Text('Check Fish Health'),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: AppTheme.primaryColor.withOpacity(0.1),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  Icons.lightbulb,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI-Powered Detection',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Take a photo to instantly check your fish health',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Common Fish Diseases',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Tap any disease to learn more about symptoms and treatments',
          style: TextStyle(
            fontSize: 14,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: AppTheme.greyColor,
          ),
          const SizedBox(height: 16),
          Text(
            'No diseases found',
            style: TextStyle(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your search or filters',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  void _showPreventionGuide() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Container(
              width: 40,
              height: 5,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: AppTheme.greyColor,
                borderRadius: BorderRadius.circular(2.5),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Icon(
                    Icons.shield,
                    color: AppTheme.primaryColor,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Disease Prevention Guide',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: DiseaseDatabase.preventiveMeasures.length,
                itemBuilder: (context, index) {
                  final measure = DiseaseDatabase.preventiveMeasures[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: _getImportanceColor(measure.importance)
                                    .withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.check_circle,
                                color: _getImportanceColor(measure.importance),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          measure.title,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: _getImportanceColor(
                                                  measure.importance)
                                              .withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          measure.importance.displayName,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: _getImportanceColor(
                                                measure.importance),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    measure.description,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getImportanceColor(Importance importance) {
    switch (importance) {
      case Importance.critical:
        return Colors.red;
      case Importance.high:
        return AppTheme.errorColor;
      case Importance.medium:
        return AppTheme.warningColor;
      case Importance.low:
        return AppTheme.primaryColor;
    }
  }
}