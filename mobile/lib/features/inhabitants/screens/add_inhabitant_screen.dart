import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';
import '../../aquarium/services/aquarium_service.dart';
import '../widgets/species_selector.dart';

class AddInhabitantScreen extends StatefulWidget {
  final String aquariumId;
  final Inhabitant? inhabitant;

  const AddInhabitantScreen({
    super.key,
    required this.aquariumId,
    this.inhabitant,
  });

  @override
  State<AddInhabitantScreen> createState() => _AddInhabitantScreenState();
}

class _AddInhabitantScreenState extends State<AddInhabitantScreen> {
  final _formKey = GlobalKey<FormState>();
  final _uuid = const Uuid();
  final _imagePicker = ImagePicker();
  
  final _nameController = TextEditingController();
  final _speciesController = TextEditingController();
  final _scientificNameController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _notesController = TextEditingController();
  
  DateTime _addedDate = DateTime.now();
  HealthStatus _healthStatus = HealthStatus.healthy;
  File? _imageFile;
  String? _imageUrl;
  bool _isLoading = false;
  bool _isUploadingImage = false;

  bool get isEditing => widget.inhabitant != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _populateFields();
    }
  }

  void _populateFields() {
    final inhabitant = widget.inhabitant!;
    _nameController.text = inhabitant.name;
    _speciesController.text = inhabitant.species;
    _scientificNameController.text = inhabitant.scientificName ?? '';
    _quantityController.text = inhabitant.quantity.toString();
    _notesController.text = inhabitant.notes ?? '';
    _addedDate = inhabitant.addedDate;
    _healthStatus = inhabitant.healthStatus;
    _imageUrl = inhabitant.imageUrl;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _speciesController.dispose();
    _scientificNameController.dispose();
    _quantityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Inhabitant' : 'Add Inhabitant'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          setState(() {
            _isLoading = state is AquariumLoading;
          });

          if (state is AquariumInhabitantAdded || state is AquariumInhabitantUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isEditing 
                    ? 'Inhabitant updated successfully'
                    : 'Inhabitant added successfully'
                ),
                backgroundColor: AppTheme.successColor,
                behavior: SnackBarBehavior.floating,
              ),
            );
            context.pop();
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
          isLoading: _isLoading || _isUploadingImage,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Image Section
                    _buildImageSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Basic Information
                    _buildBasicInfoSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Health & Status
                    _buildHealthSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Additional Information
                    _buildAdditionalInfoSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Notes
                    _buildNotesSection(),
                    
                    const SizedBox(height: 32),
                    
                    // Submit Button
                    CustomButton(
                      text: isEditing ? 'Update Inhabitant' : 'Add Inhabitant',
                      icon: Icons.save,
                      onPressed: _isLoading || _isUploadingImage ? null : _handleSubmit,
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
          'Inhabitant Photo',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Stack(
            children: [
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.borderColor,
                    width: 2,
                  ),
                  image: _imageFile != null
                      ? DecorationImage(
                          image: FileImage(_imageFile!),
                          fit: BoxFit.cover,
                        )
                      : _imageUrl != null
                          ? DecorationImage(
                              image: NetworkImage(_imageUrl!),
                              fit: BoxFit.cover,
                            )
                          : null,
                ),
                child: (_imageFile == null && _imageUrl == null)
                    ? Icon(
                        Icons.pets,
                        size: 60,
                        color: Colors.grey[400],
                      )
                    : null,
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white,
                      width: 2,
                    ),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.camera_alt, color: Colors.white),
                    onPressed: _showImagePicker,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_imageFile != null || _imageUrl != null)
          Center(
            child: TextButton(
              onPressed: () {
                setState(() {
                  _imageFile = null;
                  _imageUrl = null;
                });
              },
              child: const Text('Remove Photo'),
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.errorColor,
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
        
        CustomTextField(
          controller: _nameController,
          labelText: 'Name/Nickname',
          hintText: 'e.g., Nemo, Blue Tang #1',
          prefixIcon: Icons.label,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a name';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: CustomTextField(
                controller: _speciesController,
                labelText: 'Common Species Name',
                hintText: 'e.g., Clownfish, Blue Tang, Neon Tetra',
                prefixIcon: Icons.pets,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter the species name';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 8),
            SpeciesSelector(
              initialSpecies: _speciesController.text,
              initialScientificName: _scientificNameController.text,
              onSpeciesSelected: (species, scientificName) {
                setState(() {
                  _speciesController.text = species;
                  if (scientificName != null) {
                    _scientificNameController.text = scientificName;
                  }
                });
              },
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _scientificNameController,
          labelText: 'Scientific Name (Optional)',
          hintText: 'e.g., Amphiprion ocellaris',
          prefixIcon: Icons.science,
        ),
        
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _quantityController,
          labelText: 'Quantity',
          hintText: 'Number of individuals',
          prefixIcon: Icons.numbers,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
          ],
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter quantity';
            }
            final quantity = int.tryParse(value);
            if (quantity == null || quantity < 1) {
              return 'Quantity must be at least 1';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildHealthSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Health & Status',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Health Status
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.borderColor,
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Health Status',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Divider(height: 1),
              ...HealthStatus.values.map((status) {
                final isSelected = _healthStatus == status;
                return InkWell(
                  onTap: () {
                    setState(() {
                      _healthStatus = status;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected 
                        ? status.color.withOpacity(0.1)
                        : Colors.transparent,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          status.icon,
                          color: status.color,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            status.displayName,
                            style: TextStyle(
                              color: isSelected ? status.color : null,
                              fontWeight: isSelected 
                                ? FontWeight.w600 
                                : FontWeight.normal,
                            ),
                          ),
                        ),
                        if (isSelected)
                          Icon(
                            Icons.check,
                            color: status.color,
                            size: 20,
                          ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAdditionalInfoSection() {
    final formatter = DateFormat('MMM d, yyyy');
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional Information',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        
        // Added Date
        InkWell(
          onTap: () => _selectDate(),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.borderColor,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Added to Aquarium',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatter.format(_addedDate),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_drop_down,
                  color: Colors.grey[600],
                ),
              ],
            ),
          ),
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
          hintText: 'Any special care requirements, behavior notes, etc.',
          prefixIcon: Icons.notes,
          maxLines: 3,
          minLines: 3,
        ),
      ],
    );
  }

  void _showImagePicker() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (pickedFile != null) {
        setState(() {
          _imageFile = File(pickedFile.path);
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

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _addedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    
    if (picked != null) {
      setState(() {
        _addedDate = picked;
      });
    }
  }

  Future<String?> _uploadImage() async {
    if (_imageFile == null) return _imageUrl;

    setState(() {
      _isUploadingImage = true;
    });

    try {
      final aquariumService = context.read<AquariumService>();
      final imageUrl = await aquariumService.uploadImage(_imageFile!);
      return imageUrl;
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to upload image: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return null;
    } finally {
      setState(() {
        _isUploadingImage = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState?.validate() == true) {
      // Upload image if needed
      String? imageUrl = _imageUrl;
      if (_imageFile != null) {
        imageUrl = await _uploadImage();
        if (imageUrl == null && mounted) {
          // Image upload failed, don't proceed
          return;
        }
      }

      final inhabitant = Inhabitant(
        id: widget.inhabitant?.id ?? _uuid.v4(),
        name: _nameController.text.trim(),
        species: _speciesController.text.trim(),
        scientificName: _scientificNameController.text.trim().isEmpty 
            ? null 
            : _scientificNameController.text.trim(),
        quantity: int.parse(_quantityController.text),
        addedDate: _addedDate,
        imageUrl: imageUrl,
        notes: _notesController.text.trim().isEmpty 
            ? null 
            : _notesController.text.trim(),
        healthStatus: _healthStatus,
      );

      if (isEditing) {
        context.read<AquariumBloc>().add(
          AquariumInhabitantUpdateRequested(
            aquariumId: widget.aquariumId,
            inhabitant: inhabitant,
          ),
        );
      } else {
        context.read<AquariumBloc>().add(
          AquariumInhabitantAddRequested(
            aquariumId: widget.aquariumId,
            inhabitant: inhabitant,
          ),
        );
      }
    }
  }
}