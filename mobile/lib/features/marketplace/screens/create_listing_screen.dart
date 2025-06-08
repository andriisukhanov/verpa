import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/marketplace_models.dart';
import '../services/marketplace_service.dart';

class CreateListingScreen extends StatefulWidget {
  final MarketplaceListing? listing;

  const CreateListingScreen({
    super.key,
    this.listing,
  });

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _locationController = TextEditingController();
  final _shippingCostController = TextEditingController();
  
  ListingCategory _selectedCategory = ListingCategory.equipment;
  ListingCondition _selectedCondition = ListingCondition.good;
  bool _shippingAvailable = false;
  bool _isLoading = false;
  
  final List<XFile> _images = [];
  final Map<String, String> _specifications = {};
  final List<String> _tags = [];
  
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    if (widget.listing != null) {
      _populateFields();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _locationController.dispose();
    _shippingCostController.dispose();
    super.dispose();
  }

  void _populateFields() {
    final listing = widget.listing!;
    _titleController.text = listing.title;
    _descriptionController.text = listing.description;
    _priceController.text = listing.price.toStringAsFixed(2);
    _locationController.text = listing.location;
    _selectedCategory = listing.category;
    _selectedCondition = listing.condition;
    _shippingAvailable = listing.shippingAvailable;
    if (listing.shippingCost != null) {
      _shippingCostController.text = listing.shippingCost!.toStringAsFixed(2);
    }
    if (listing.specifications != null) {
      _specifications.addAll(listing.specifications!.map(
        (key, value) => MapEntry(key, value.toString()),
      ));
    }
    _tags.addAll(listing.tags);
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile> pickedImages = await _imagePicker.pickMultiImage();
      
      if (pickedImages.isNotEmpty) {
        setState(() {
          _images.addAll(pickedImages);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error picking images: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  void _addSpecification() {
    showDialog(
      context: context,
      builder: (context) {
        final keyController = TextEditingController();
        final valueController = TextEditingController();
        
        return AlertDialog(
          title: const Text('Add Specification'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: keyController,
                decoration: const InputDecoration(
                  labelText: 'Name (e.g., Brand, Size)',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: valueController,
                decoration: const InputDecoration(
                  labelText: 'Value',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (keyController.text.isNotEmpty &&
                    valueController.text.isNotEmpty) {
                  setState(() {
                    _specifications[keyController.text] = valueController.text;
                  });
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  void _addTag() {
    showDialog(
      context: context,
      builder: (context) {
        final tagController = TextEditingController();
        
        return AlertDialog(
          title: const Text('Add Tag'),
          content: TextField(
            controller: tagController,
            decoration: const InputDecoration(
              labelText: 'Tag',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (tagController.text.isNotEmpty) {
                  setState(() {
                    _tags.add(tagController.text.toLowerCase());
                  });
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoading = true);

    try {
      final position = await MarketplaceService.getCurrentLocation();
      if (position != null) {
        // In a real app, you would reverse geocode to get the address
        setState(() {
          _locationController.text = 'Current Location';
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error getting location: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveListing() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_images.isEmpty && widget.listing == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add at least one image'),
          backgroundColor: AppTheme.warningColor,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Upload images
      List<String> imageUrls = [];
      if (_images.isNotEmpty) {
        imageUrls = await MarketplaceService.uploadImages(_images);
      } else if (widget.listing != null) {
        imageUrls = widget.listing!.images;
      }

      if (widget.listing == null) {
        // Create new listing
        final listing = await MarketplaceService.createListing(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _selectedCategory,
          condition: _selectedCondition,
          price: double.parse(_priceController.text),
          images: imageUrls,
          location: _locationController.text.trim(),
          shippingAvailable: _shippingAvailable,
          shippingCost: _shippingAvailable && _shippingCostController.text.isNotEmpty
              ? double.parse(_shippingCostController.text)
              : null,
          specifications: _specifications.isNotEmpty ? _specifications : null,
          tags: _tags,
        );

        if (listing != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Listing created successfully!'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.go('/marketplace');
        }
      } else {
        // Update existing listing
        final updatedListing = widget.listing!.copyWith(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          category: _selectedCategory,
          condition: _selectedCondition,
          price: double.parse(_priceController.text),
          images: imageUrls,
          location: _locationController.text.trim(),
          shippingAvailable: _shippingAvailable,
          shippingCost: _shippingAvailable && _shippingCostController.text.isNotEmpty
              ? double.parse(_shippingCostController.text)
              : null,
          specifications: _specifications.isNotEmpty ? _specifications : null,
          tags: _tags,
        );

        final success = await MarketplaceService.updateListing(updatedListing);
        
        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Listing updated successfully!'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.pop();
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LoadingOverlay(
      isLoading: _isLoading,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.listing == null ? 'Create Listing' : 'Edit Listing'),
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Images
                _buildSectionTitle('Photos'),
                Container(
                  height: 120,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      // Add photo button
                      GestureDetector(
                        onTap: _pickImages,
                        child: Container(
                          width: 100,
                          height: 100,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppTheme.primaryColor,
                              width: 2,
                              style: BorderStyle.dashed,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_photo_alternate,
                                size: 32,
                                color: AppTheme.primaryColor,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Add Photos',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Image previews
                      ..._images.asMap().entries.map((entry) {
                        final index = entry.key;
                        final image = entry.value;
                        
                        return Stack(
                          children: [
                            Container(
                              width: 100,
                              height: 100,
                              margin: const EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                image: DecorationImage(
                                  image: FileImage(File(image.path)),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 12,
                              child: GestureDetector(
                                onTap: () => _removeImage(index),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 16,
                                    color: Colors.red,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Category
                _buildSectionTitle('Category'),
                Wrap(
                  spacing: 8,
                  children: ListingCategory.values.map((category) {
                    return ChoiceChip(
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(category.icon, size: 16),
                          const SizedBox(width: 4),
                          Text(category.displayName),
                        ],
                      ),
                      selected: _selectedCategory == category,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedCategory = category);
                        }
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                
                // Title
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    hintText: 'Enter a descriptive title',
                    border: OutlineInputBorder(),
                  ),
                  maxLength: 80,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a title';
                    }
                    if (value.length < 5) {
                      return 'Title must be at least 5 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                // Description
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Describe the item in detail',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                  maxLines: 5,
                  maxLength: 1000,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a description';
                    }
                    if (value.length < 20) {
                      return 'Description must be at least 20 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                
                // Condition
                _buildSectionTitle('Condition'),
                Wrap(
                  spacing: 8,
                  children: ListingCondition.values.map((condition) {
                    return ChoiceChip(
                      label: Text(condition.displayName),
                      selected: _selectedCondition == condition,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedCondition = condition);
                        }
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                
                // Price
                TextFormField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: 'Price',
                    prefixText: '\$',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a price';
                    }
                    final price = double.tryParse(value);
                    if (price == null || price <= 0) {
                      return 'Please enter a valid price';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                
                // Location
                _buildSectionTitle('Location'),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          hintText: 'City, State',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a location';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _getCurrentLocation,
                      icon: const Icon(Icons.my_location),
                      style: IconButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Shipping
                _buildSectionTitle('Shipping'),
                SwitchListTile(
                  title: const Text('Shipping Available'),
                  subtitle: const Text('Can you ship this item?'),
                  value: _shippingAvailable,
                  onChanged: (value) {
                    setState(() => _shippingAvailable = value);
                  },
                  contentPadding: EdgeInsets.zero,
                ),
                if (_shippingAvailable) ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _shippingCostController,
                    decoration: const InputDecoration(
                      labelText: 'Shipping Cost',
                      prefixText: '\$',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                    ],
                  ),
                ],
                const SizedBox(height: 24),
                
                // Specifications
                _buildSectionTitle('Specifications (Optional)'),
                if (_specifications.isNotEmpty) ...[
                  ..._specifications.entries.map((entry) {
                    return Chip(
                      label: Text('${entry.key}: ${entry.value}'),
                      onDeleted: () {
                        setState(() {
                          _specifications.remove(entry.key);
                        });
                      },
                    );
                  }),
                  const SizedBox(height: 8),
                ],
                CustomButton(
                  text: 'Add Specification',
                  icon: Icons.add,
                  size: ButtonSize.small,
                  variant: ButtonVariant.outline,
                  onPressed: _addSpecification,
                ),
                const SizedBox(height: 24),
                
                // Tags
                _buildSectionTitle('Tags (Optional)'),
                if (_tags.isNotEmpty) ...[
                  Wrap(
                    spacing: 8,
                    children: _tags.map((tag) {
                      return Chip(
                        label: Text(tag),
                        onDeleted: () {
                          setState(() {
                            _tags.remove(tag);
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                ],
                CustomButton(
                  text: 'Add Tag',
                  icon: Icons.add,
                  size: ButtonSize.small,
                  variant: ButtonVariant.outline,
                  onPressed: _addTag,
                ),
                const SizedBox(height: 32),
                
                // Submit button
                CustomButton(
                  text: widget.listing == null ? 'Create Listing' : 'Update Listing',
                  onPressed: _saveListing,
                  fullWidth: true,
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}