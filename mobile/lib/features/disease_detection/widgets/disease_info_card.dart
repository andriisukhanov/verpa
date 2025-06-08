import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/disease_detection_result.dart';

class DiseaseInfoCard extends StatefulWidget {
  final DetectedDisease disease;
  final VoidCallback? onLearnMore;

  const DiseaseInfoCard({
    super.key,
    required this.disease,
    this.onLearnMore,
  });

  @override
  State<DiseaseInfoCard> createState() => _DiseaseInfoCardState();
}

class _DiseaseInfoCardState extends State<DiseaseInfoCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final severityColor = _getSeverityColor(widget.disease.severity);
    
    return Card(
      elevation: 2,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.all(16),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          onExpansionChanged: (expanded) {
            setState(() => _isExpanded = expanded);
          },
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: severityColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.coronavirus,
              color: severityColor,
              size: 28,
            ),
          ),
          title: Text(
            widget.disease.name,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.disease.scientificName,
                style: const TextStyle(
                  fontStyle: FontStyle.italic,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: severityColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      widget.disease.severity.displayName,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: severityColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${(widget.disease.confidence * 100).toStringAsFixed(0)}% match',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          trailing: Icon(
            _isExpanded ? Icons.expand_less : Icons.expand_more,
          ),
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Description
                Text(
                  widget.disease.description,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                    height: 1.4,
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Symptoms
                _buildSection(
                  'Symptoms',
                  widget.disease.symptoms,
                  Icons.sick,
                  AppTheme.errorColor,
                ),
                
                const SizedBox(height: 16),
                
                // Causes
                _buildSection(
                  'Common Causes',
                  widget.disease.causes,
                  Icons.psychology,
                  AppTheme.warningColor,
                ),
                
                const SizedBox(height: 16),
                
                // Affected Areas
                Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 20,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Affected Areas: ',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        widget.disease.affectedAreas.join(', '),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
                
                if (widget.disease.isContagious) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.warningColor.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.warning,
                          color: AppTheme.warningColor,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Contagious Disease',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.warningColor,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'This disease can spread to other fish. Consider quarantine measures.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.warningColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                
                if (widget.onLearnMore != null) ...[
                  const SizedBox(height: 16),
                  Center(
                    child: CustomButton(
                      text: 'Learn More',
                      icon: Icons.info_outline,
                      variant: ButtonVariant.outline,
                      size: ButtonSize.small,
                      onPressed: widget.onLearnMore,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    String title,
    List<String> items,
    IconData icon,
    Color color,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...items.map((item) => 
          Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 28),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
                Expanded(
                  child: Text(
                    item,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Color _getSeverityColor(DiseaseSeverity severity) {
    switch (severity) {
      case DiseaseSeverity.mild:
        return AppTheme.warningColor;
      case DiseaseSeverity.moderate:
        return Colors.orange;
      case DiseaseSeverity.severe:
        return AppTheme.errorColor;
      case DiseaseSeverity.critical:
        return Colors.red[900]!;
    }
  }
}