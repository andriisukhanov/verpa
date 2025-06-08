import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../bloc/aquarium_bloc.dart';
import '../models/aquarium_model.dart';

class RecordParametersScreen extends StatefulWidget {
  final String aquariumId;
  
  const RecordParametersScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<RecordParametersScreen> createState() => _RecordParametersScreenState();
}

class _RecordParametersScreenState extends State<RecordParametersScreen> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();
  
  // Primary parameters
  final _temperatureController = TextEditingController();
  final _phController = TextEditingController();
  final _ammoniaController = TextEditingController();
  final _nitriteController = TextEditingController();
  final _nitrateController = TextEditingController();
  
  // Additional parameters
  final _salinityController = TextEditingController();
  final _khController = TextEditingController();
  final _ghController = TextEditingController();
  final _phosphateController = TextEditingController();
  final _calciumController = TextEditingController();
  final _magnesiumController = TextEditingController();
  final _alkalinityController = TextEditingController();
  
  // Notes
  final _notesController = TextEditingController();
  
  bool _isLoading = false;
  bool _showAdditionalParameters = false;
  String _temperatureUnit = 'F';
  
  @override
  void dispose() {
    _temperatureController.dispose();
    _phController.dispose();
    _ammoniaController.dispose();
    _nitriteController.dispose();
    _nitrateController.dispose();
    _salinityController.dispose();
    _khController.dispose();
    _ghController.dispose();
    _phosphateController.dispose();
    _calciumController.dispose();
    _magnesiumController.dispose();
    _alkalinityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Water Parameters'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          setState(() {
            _isLoading = state is AquariumParameterRecording;
          });

          if (state is AquariumParameterRecorded) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.successColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
            Navigator.of(context).pop();
          } else if (state is AquariumError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.errorColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: LoadingOverlay(
          isLoading: _isLoading,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Info Card
                    _buildInfoCard(),
                    
                    const SizedBox(height: 24),
                    
                    // Primary Parameters
                    _buildPrimaryParametersSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Additional Parameters Toggle
                    _buildAdditionalParametersToggle(),
                    
                    if (_showAdditionalParameters) ...[
                      const SizedBox(height: 24),
                      _buildAdditionalParametersSection(),
                    ],
                    
                    const SizedBox(height: 24),
                    
                    // Notes Section
                    _buildNotesSection(),
                    
                    const SizedBox(height: 32),
                    
                    // Submit Button
                    CustomButton(
                      text: 'Record Parameters',
                      icon: Icons.save,
                      onPressed: _isLoading ? null : _handleSubmit,
                      isLoading: _isLoading,
                    ),
                    
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      color: AppTheme.infoColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.info_outline,
              color: AppTheme.infoColor,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Record your current water parameters. Regular testing helps maintain a healthy aquarium.',
                style: TextStyle(
                  color: AppTheme.infoColor,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrimaryParametersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Primary Parameters',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Temperature
        Row(
          children: [
            Expanded(
              flex: 2,
              child: CustomTextField(
                controller: _temperatureController,
                labelText: 'Temperature',
                hintText: 'Enter temperature',
                prefixIcon: Icons.thermostat,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return null; // Optional field
                  }
                  final temp = double.tryParse(value);
                  if (temp == null) {
                    return 'Enter a valid number';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.borderColor,
                    width: 1,
                  ),
                ),
                child: DropdownButtonFormField<String>(
                  value: _temperatureUnit,
                  items: ['F', 'C'].map((unit) {
                    return DropdownMenuItem<String>(
                      value: unit,
                      child: Text('°$unit'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _temperatureUnit = value!;
                    });
                  },
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // pH
        CustomTextField(
          controller: _phController,
          labelText: 'pH Level',
          hintText: 'Enter pH (0-14)',
          prefixIcon: Icons.science,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return null; // Optional field
            }
            final ph = double.tryParse(value);
            if (ph == null || ph < 0 || ph > 14) {
              return 'pH must be between 0 and 14';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // Nitrogen Cycle Parameters
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _ammoniaController,
                labelText: 'Ammonia (ppm)',
                hintText: 'NH₃',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _ppmValidator,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _nitriteController,
                labelText: 'Nitrite (ppm)',
                hintText: 'NO₂',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _ppmValidator,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _nitrateController,
                labelText: 'Nitrate (ppm)',
                hintText: 'NO₃',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _ppmValidator,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAdditionalParametersToggle() {
    return InkWell(
      onTap: () {
        setState(() {
          _showAdditionalParameters = !_showAdditionalParameters;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.borderColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Additional Parameters',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            Icon(
              _showAdditionalParameters
                  ? Icons.keyboard_arrow_up
                  : Icons.keyboard_arrow_down,
              color: AppTheme.primaryColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdditionalParametersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Salinity (for saltwater/reef tanks)
        CustomTextField(
          controller: _salinityController,
          labelText: 'Salinity (ppt)',
          hintText: 'Parts per thousand',
          prefixIcon: Icons.water,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          validator: _optionalNumberValidator,
        ),
        
        const SizedBox(height: 16),
        
        // Hardness
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _khController,
                labelText: 'KH (dKH)',
                hintText: 'Carbonate hardness',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _ghController,
                labelText: 'GH (dGH)',
                hintText: 'General hardness',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Reef parameters
        Text(
          'Reef Parameters',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _phosphateController,
                labelText: 'Phosphate (ppm)',
                hintText: 'PO₄',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _calciumController,
                labelText: 'Calcium (ppm)',
                hintText: 'Ca',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _magnesiumController,
                labelText: 'Magnesium (ppm)',
                hintText: 'Mg',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CustomTextField(
                controller: _alkalinityController,
                labelText: 'Alkalinity (dKH)',
                hintText: 'Alk',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: _optionalNumberValidator,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Notes (Optional)',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _notesController,
          labelText: 'Additional Notes',
          hintText: 'Any observations or comments about the water quality',
          prefixIcon: Icons.notes,
          maxLines: 3,
          minLines: 3,
        ),
      ],
    );
  }

  String? _ppmValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null; // Optional field
    }
    final ppm = double.tryParse(value);
    if (ppm == null || ppm < 0) {
      return 'Enter a valid positive number';
    }
    return null;
  }

  String? _optionalNumberValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null; // Optional field
    }
    final number = double.tryParse(value);
    if (number == null || number < 0) {
      return 'Enter a valid positive number';
    }
    return null;
  }

  void _handleSubmit() {
    if (_formKey.currentState?.validate() == true) {
      // Convert temperature to Fahrenheit if needed
      double? temperature;
      if (_temperatureController.text.isNotEmpty) {
        temperature = double.parse(_temperatureController.text);
        if (_temperatureUnit == 'C') {
          temperature = (temperature * 9 / 5) + 32; // Convert to Fahrenheit
        }
      }

      final parameters = WaterParameters(
        id: _uuid.v4(),
        aquariumId: widget.aquariumId,
        recordedAt: DateTime.now(),
        temperature: temperature,
        ph: _phController.text.isEmpty ? null : double.parse(_phController.text),
        ammonia: _ammoniaController.text.isEmpty ? null : double.parse(_ammoniaController.text),
        nitrite: _nitriteController.text.isEmpty ? null : double.parse(_nitriteController.text),
        nitrate: _nitrateController.text.isEmpty ? null : double.parse(_nitrateController.text),
        salinity: _salinityController.text.isEmpty ? null : double.parse(_salinityController.text),
        kh: _khController.text.isEmpty ? null : double.parse(_khController.text),
        gh: _ghController.text.isEmpty ? null : double.parse(_ghController.text),
        phosphate: _phosphateController.text.isEmpty ? null : double.parse(_phosphateController.text),
        calcium: _calciumController.text.isEmpty ? null : double.parse(_calciumController.text),
        magnesium: _magnesiumController.text.isEmpty ? null : double.parse(_magnesiumController.text),
        alkalinity: _alkalinityController.text.isEmpty ? null : double.parse(_alkalinityController.text),
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );

      context.read<AquariumBloc>().add(
        AquariumParametersRecordRequested(
          aquariumId: widget.aquariumId,
          parameters: parameters,
        ),
      );
    }
  }
}