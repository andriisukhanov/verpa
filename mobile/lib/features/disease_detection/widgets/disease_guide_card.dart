import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../models/disease_database.dart';

class DiseaseGuideCard extends StatefulWidget {
  final DiseaseInfo disease;
  final bool isHighlighted;

  const DiseaseGuideCard({
    super.key,
    required this.disease,
    this.isHighlighted = false,
  });

  @override
  State<DiseaseGuideCard> createState() => _DiseaseGuideCardState();
}

class _DiseaseGuideCardState extends State<DiseaseGuideCard> {
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    if (widget.isHighlighted) {
      _isExpanded = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: widget.isHighlighted ? 4 : 2,
      color: widget.isHighlighted 
          ? AppTheme.primaryColor.withOpacity(0.05)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: widget.isHighlighted
            ? BorderSide(
                color: AppTheme.primaryColor.withOpacity(0.3),
                width: 2,
              )
            : BorderSide.none,
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.all(16),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          initiallyExpanded: _isExpanded,
          onExpansionChanged: (expanded) {
            setState(() => _isExpanded = expanded);
          },
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _getDiseaseColor(widget.disease).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              _getDiseaseIcon(widget.disease),
              color: _getDiseaseColor(widget.disease),
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
                  if (widget.disease.isContagious) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.warningColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.warning,
                            size: 12,
                            color: AppTheme.warningColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Contagious',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.warningColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    '${widget.disease.symptoms.length} symptoms',
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
                  'Symptoms to Watch For',
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
                
                const SizedBox(height: 16),
                
                // Treatments
                Text(
                  'Available Treatments',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 8),
                ...widget.disease.treatments.map((treatment) => 
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.successColor.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppTheme.successColor.withOpacity(0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _getTreatmentIcon(treatment.type),
                                size: 20,
                                color: AppTheme.successColor,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  treatment.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: _getPriorityColor(treatment.priority)
                                      .withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  treatment.priority.displayName,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: _getPriorityColor(treatment.priority),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            treatment.description,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          if (treatment.medication != null) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  Icons.medication,
                                  size: 16,
                                  color: AppTheme.primaryColor,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Medication: ${treatment.medication}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
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

  Color _getDiseaseColor(DiseaseInfo disease) {
    if (disease.id == 'ich' || disease.id == 'velvet') return Colors.blue;
    if (disease.id == 'fin_rot' || disease.id == 'dropsy') return Colors.red;
    if (disease.id == 'fungal_infection') return Colors.purple;
    return AppTheme.primaryColor;
  }

  IconData _getDiseaseIcon(DiseaseInfo disease) {
    if (disease.id == 'ich' || disease.id == 'velvet') return Icons.coronavirus;
    if (disease.id == 'fin_rot' || disease.id == 'dropsy') return Icons.dangerous;
    if (disease.id == 'fungal_infection') return Icons.grass;
    return Icons.sick;
  }

  IconData _getTreatmentIcon(TreatmentType type) {
    switch (type) {
      case TreatmentType.medication:
        return Icons.medication;
      case TreatmentType.waterChange:
        return Icons.water_drop;
      case TreatmentType.quarantine:
        return Icons.isolate;
      case TreatmentType.dietary:
        return Icons.restaurant;
      case TreatmentType.environmental:
        return Icons.thermostat;
      case TreatmentType.general:
        return Icons.healing;
    }
  }

  Color _getPriorityColor(TreatmentPriority priority) {
    switch (priority) {
      case TreatmentPriority.urgent:
        return Colors.red;
      case TreatmentPriority.high:
        return AppTheme.errorColor;
      case TreatmentPriority.medium:
        return AppTheme.warningColor;
      case TreatmentPriority.low:
        return AppTheme.primaryColor;
    }
  }
}