import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/aquarium_model.dart';

class ParameterDisplay extends StatelessWidget {
  final WaterParameters parameters;
  final bool showTimestamp;

  const ParameterDisplay({
    super.key,
    required this.parameters,
    this.showTimestamp = true,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showTimestamp) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Water Parameters',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    DateFormat('MMM d, h:mm a').format(parameters.recordedAt),
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            
            // Primary Parameters
            _buildParameterSection(
              context,
              'Primary Parameters',
              [
                _ParameterItem('Temperature', parameters.temperature, '°F', 
                  ideal: '75-80', warning: parameters.temperature != null && 
                  (parameters.temperature! < 72 || parameters.temperature! > 82)),
                _ParameterItem('pH', parameters.ph, '', 
                  ideal: '6.8-7.5', warning: parameters.ph != null && 
                  (parameters.ph! < 6.5 || parameters.ph! > 8.0)),
                _ParameterItem('Ammonia', parameters.ammonia, 'ppm', 
                  ideal: '0', critical: parameters.ammonia != null && parameters.ammonia! > 0),
                _ParameterItem('Nitrite', parameters.nitrite, 'ppm', 
                  ideal: '0', critical: parameters.nitrite != null && parameters.nitrite! > 0),
                _ParameterItem('Nitrate', parameters.nitrate, 'ppm', 
                  ideal: '<20', warning: parameters.nitrate != null && parameters.nitrate! > 40),
              ],
            ),
            
            // Additional Parameters (if any)
            if (_hasAdditionalParameters()) ...[
              const SizedBox(height: 24),
              _buildParameterSection(
                context,
                'Additional Parameters',
                [
                  if (parameters.salinity != null)
                    _ParameterItem('Salinity', parameters.salinity, 'ppt'),
                  if (parameters.kh != null)
                    _ParameterItem('KH', parameters.kh, 'dKH'),
                  if (parameters.gh != null)
                    _ParameterItem('GH', parameters.gh, 'dGH'),
                  if (parameters.phosphate != null)
                    _ParameterItem('Phosphate', parameters.phosphate, 'ppm'),
                  if (parameters.calcium != null)
                    _ParameterItem('Calcium', parameters.calcium, 'ppm'),
                  if (parameters.magnesium != null)
                    _ParameterItem('Magnesium', parameters.magnesium, 'ppm'),
                  if (parameters.alkalinity != null)
                    _ParameterItem('Alkalinity', parameters.alkalinity, 'dKH'),
                ],
              ),
            ],
            
            // Notes
            if (parameters.notes != null && parameters.notes!.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                'Notes',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                parameters.notes!,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildParameterSection(
    BuildContext context,
    String title,
    List<_ParameterItem> items,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        ...items.map((item) => _buildParameterRow(context, item)),
      ],
    );
  }

  Widget _buildParameterRow(BuildContext context, _ParameterItem item) {
    if (item.value == null) return const SizedBox.shrink();
    
    Color? valueColor;
    IconData? statusIcon;
    
    if (item.critical) {
      valueColor = AppTheme.errorColor;
      statusIcon = Icons.error;
    } else if (item.warning) {
      valueColor = AppTheme.warningColor;
      statusIcon = Icons.warning;
    }
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Text(
                  item.label,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (item.ideal != null) ...[
                  const SizedBox(width: 4),
                  Tooltip(
                    message: 'Ideal: ${item.ideal}',
                    child: Icon(
                      Icons.info_outline,
                      size: 14,
                      color: AppTheme.textSecondary.withOpacity(0.5),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (statusIcon != null) ...[
                  Icon(
                    statusIcon,
                    size: 16,
                    color: valueColor,
                  ),
                  const SizedBox(width: 4),
                ],
                Text(
                  '${item.value}${item.unit.isNotEmpty ? ' ${item.unit}' : ''}',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: valueColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _hasAdditionalParameters() {
    return parameters.salinity != null ||
        parameters.kh != null ||
        parameters.gh != null ||
        parameters.phosphate != null ||
        parameters.calcium != null ||
        parameters.magnesium != null ||
        parameters.alkalinity != null;
  }
}

class _ParameterItem {
  final String label;
  final double? value;
  final String unit;
  final String? ideal;
  final bool warning;
  final bool critical;

  const _ParameterItem(
    this.label,
    this.value,
    this.unit, {
    this.ideal,
    this.warning = false,
    this.critical = false,
  });
}