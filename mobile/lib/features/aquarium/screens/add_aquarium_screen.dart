import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../bloc/aquarium_bloc.dart';
import '../models/aquarium_model.dart';

class AddAquariumScreen extends StatefulWidget {
  const AddAquariumScreen({super.key});

  @override
  State<AddAquariumScreen> createState() => _AddAquariumScreenState();
}

class _AddAquariumScreenState extends State<AddAquariumScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _volumeController = TextEditingController();
  final _lengthController = TextEditingController();
  final _widthController = TextEditingController();
  final _heightController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  
  AquariumType _selectedType = AquariumType.freshwater;
  WaterType _selectedWaterType = WaterType.freshwater;
  String _volumeUnit = 'gallons';
  String _dimensionUnit = 'inches';
  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _volumeController.dispose();
    _lengthController.dispose();
    _widthController.dispose();
    _heightController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add New Aquarium'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          setState(() {
            _isLoading = state is AquariumCreating;
          });

          if (state is AquariumCreated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.successColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
            context.go('/dashboard');
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
                    // Image Selection
                    _buildImageSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Basic Information
                    _buildBasicInfoSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Tank Specifications
                    _buildSpecificationsSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Additional Details
                    _buildAdditionalDetailsSection(),
                    
                    const SizedBox(height: 32),
                    
                    // Submit Button
                    CustomButton(
                      text: 'Create Aquarium',
                      icon: Icons.add,
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

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Aquarium Photo',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        GestureDetector(
          onTap: _pickImage,
          child: Container(
            height: 200,
            decoration: BoxDecoration(
              color: AppTheme.lightGreyColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.borderColor,
                width: 2,
              ),
              image: _selectedImage != null
                  ? DecorationImage(
                      image: FileImage(_selectedImage!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: _selectedImage == null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt,
                        size: 48,
                        color: AppTheme.greyColor,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tap to add photo',
                        style: TextStyle(
                          color: AppTheme.greyColor,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  )
                : Stack(
                    children: [
                      Positioned(
                        top: 8,
                        right: 8,
                        child: CircleAvatar(
                          backgroundColor: Colors.white,
                          child: IconButton(
                            icon: const Icon(Icons.close, color: Colors.black),
                            onPressed: () {
                              setState(() {
                                _selectedImage = null;
                              });
                            },
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

  Widget _buildBasicInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Basic Information',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Name Field
        CustomTextField(
          controller: _nameController,
          labelText: 'Aquarium Name',
          hintText: 'Enter a name for your aquarium',
          prefixIcon: Icons.label,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter an aquarium name';
            }
            if (value.trim().length < 3) {
              return 'Name must be at least 3 characters';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // Aquarium Type
        _buildDropdownField<AquariumType>(
          label: 'Aquarium Type',
          value: _selectedType,
          items: AquariumType.values,
          onChanged: (value) {
            setState(() {
              _selectedType = value!;
              // Auto-update water type based on aquarium type
              if (value == AquariumType.saltwater || value == AquariumType.reef) {
                _selectedWaterType = WaterType.saltwater;
              } else if (value == AquariumType.brackish) {
                _selectedWaterType = WaterType.brackish;
              } else {
                _selectedWaterType = WaterType.freshwater;
              }
            });
          },
          itemBuilder: (type) => type.displayName,
        ),
        
        const SizedBox(height: 16),
        
        // Water Type
        _buildDropdownField<WaterType>(
          label: 'Water Type',
          value: _selectedWaterType,
          items: WaterType.values,
          onChanged: (value) {
            setState(() {
              _selectedWaterType = value!;
            });
          },
          itemBuilder: (type) => type.value[0].toUpperCase() + type.value.substring(1),
        ),
      ],
    );
  }

  Widget _buildSpecificationsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tank Specifications',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Volume
        Row(
          children: [
            Expanded(
              flex: 2,
              child: CustomTextField(
                controller: _volumeController,
                labelText: 'Volume',
                hintText: 'Enter tank volume',
                prefixIcon: Icons.water,
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter volume';
                  }
                  final volume = double.tryParse(value);
                  if (volume == null || volume <= 0) {
                    return 'Enter a valid volume';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildUnitDropdown(
                value: _volumeUnit,
                items: ['gallons', 'liters'],
                onChanged: (value) {
                  setState(() {
                    _volumeUnit = value!;
                  });
                },
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Dimensions
        Text(
          'Dimensions',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _lengthController,
                labelText: 'Length',
                hintText: 'L',
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Required';
                  }
                  final length = double.tryParse(value);
                  if (length == null || length <= 0) {
                    return 'Invalid';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: CustomTextField(
                controller: _widthController,
                labelText: 'Width',
                hintText: 'W',
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Required';
                  }
                  final width = double.tryParse(value);
                  if (width == null || width <= 0) {
                    return 'Invalid';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: CustomTextField(
                controller: _heightController,
                labelText: 'Height',
                hintText: 'H',
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Required';
                  }
                  final height = double.tryParse(value);
                  if (height == null || height <= 0) {
                    return 'Invalid';
                  }
                  return null;
                },
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 8),
        
        _buildUnitDropdown(
          value: _dimensionUnit,
          items: ['inches', 'centimeters'],
          onChanged: (value) {
            setState(() {
              _dimensionUnit = value!;
            });
          },
        ),
      ],
    );
  }

  Widget _buildAdditionalDetailsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional Details (Optional)',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Location
        CustomTextField(
          controller: _locationController,
          labelText: 'Location',
          hintText: 'Where is this aquarium located?',
          prefixIcon: Icons.location_on,
        ),
        
        const SizedBox(height: 16),
        
        // Description
        CustomTextField(
          controller: _descriptionController,
          labelText: 'Description',
          hintText: 'Add any notes or description about this aquarium',
          prefixIcon: Icons.notes,
          maxLines: 3,
          minLines: 3,
        ),
      ],
    );
  }

  Widget _buildDropdownField<T>({
    required String label,
    required T value,
    required List<T> items,
    required void Function(T?) onChanged,
    required String Function(T) itemBuilder,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.borderColor,
              width: 1,
            ),
          ),
          child: DropdownButtonFormField<T>(
            value: value,
            items: items.map((item) {
              return DropdownMenuItem<T>(
                value: item,
                child: Text(itemBuilder(item)),
              );
            }).toList(),
            onChanged: onChanged,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUnitDropdown({
    required String value,
    required List<String> items,
    required void Function(String?) onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.borderColor,
          width: 1,
        ),
      ),
      child: DropdownButtonFormField<String>(
        value: value,
        items: items.map((item) {
          return DropdownMenuItem<String>(
            value: item,
            child: Text(item),
          );
        }).toList(),
        onChanged: onChanged,
        decoration: const InputDecoration(
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final pickedFile = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1080,
      maxHeight: 1080,
      imageQuality: 85,
    );

    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  void _handleSubmit() {
    if (_formKey.currentState?.validate() == true) {
      final dimensions = AquariumDimensions(
        length: double.parse(_lengthController.text),
        width: double.parse(_widthController.text),
        height: double.parse(_heightController.text),
        unit: _dimensionUnit,
      );

      context.read<AquariumBloc>().add(
        AquariumCreateRequested(
          name: _nameController.text.trim(),
          type: _selectedType,
          volume: double.parse(_volumeController.text),
          volumeUnit: _volumeUnit,
          dimensions: dimensions,
          waterType: _selectedWaterType,
          description: _descriptionController.text.trim().isEmpty 
              ? null 
              : _descriptionController.text.trim(),
          location: _locationController.text.trim().isEmpty 
              ? null 
              : _locationController.text.trim(),
          imagePath: _selectedImage?.path,
        ),
      );
    }
  }
}