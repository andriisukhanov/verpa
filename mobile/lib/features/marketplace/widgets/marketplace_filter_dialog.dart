import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/marketplace_models.dart';
import '../services/marketplace_service.dart';

class MarketplaceFilterDialog extends StatefulWidget {
  final MarketplaceFilter currentFilter;
  final Function(MarketplaceFilter) onApply;

  const MarketplaceFilterDialog({
    super.key,
    required this.currentFilter,
    required this.onApply,
  });

  @override
  State<MarketplaceFilterDialog> createState() => _MarketplaceFilterDialogState();
}

class _MarketplaceFilterDialogState extends State<MarketplaceFilterDialog> {
  late ListingCategory? _selectedCategory;
  late ListingCondition? _selectedCondition;
  late RangeValues _priceRange;
  late bool? _shippingAvailable;
  late MarketplaceSortOption _sortBy;
  
  String? _location;
  double? _maxDistance;
  bool _isLoadingLocation = false;
  
  final _minPriceController = TextEditingController();
  final _maxPriceController = TextEditingController();
  final _maxDistanceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.currentFilter.category;
    _selectedCondition = widget.currentFilter.condition;
    _shippingAvailable = widget.currentFilter.shippingAvailable;
    _sortBy = widget.currentFilter.sortBy;
    _location = widget.currentFilter.location;
    _maxDistance = widget.currentFilter.maxDistance;
    
    _priceRange = RangeValues(
      widget.currentFilter.minPrice ?? 0,
      widget.currentFilter.maxPrice ?? 10000,
    );
    
    _minPriceController.text = widget.currentFilter.minPrice?.toStringAsFixed(0) ?? '';
    _maxPriceController.text = widget.currentFilter.maxPrice?.toStringAsFixed(0) ?? '';
    _maxDistanceController.text = widget.currentFilter.maxDistance?.toStringAsFixed(0) ?? '';
  }

  @override
  void dispose() {
    _minPriceController.dispose();
    _maxPriceController.dispose();
    _maxDistanceController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);

    try {
      final position = await MarketplaceService.getCurrentLocation();
      if (position != null && mounted) {
        setState(() {
          _location = 'Current Location';
          _isLoadingLocation = false;
        });
      }
    } catch (e) {
      setState(() => _isLoadingLocation = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to get current location'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _applyFilters() {
    final filter = MarketplaceFilter(
      category: _selectedCategory,
      condition: _selectedCondition,
      minPrice: _priceRange.start > 0 ? _priceRange.start : null,
      maxPrice: _priceRange.end < 10000 ? _priceRange.end : null,
      location: _location,
      maxDistance: _maxDistance,
      shippingAvailable: _shippingAvailable,
      searchQuery: widget.currentFilter.searchQuery,
      sortBy: _sortBy,
    );
    
    widget.onApply(filter);
    Navigator.pop(context);
  }

  void _resetFilters() {
    setState(() {
      _selectedCategory = null;
      _selectedCondition = null;
      _priceRange = const RangeValues(0, 10000);
      _shippingAvailable = null;
      _sortBy = MarketplaceSortOption.newest;
      _location = null;
      _maxDistance = null;
      
      _minPriceController.clear();
      _maxPriceController.clear();
      _maxDistanceController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.filter_list,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Filter Listings',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _resetFilters,
                    child: const Text(
                      'Reset',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            
            // Filters
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sort By
                    _buildSectionTitle('Sort By'),
                    Wrap(
                      spacing: 8,
                      children: MarketplaceSortOption.values.map((option) {
                        return ChoiceChip(
                          label: Text(option.displayName),
                          selected: _sortBy == option,
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => _sortBy = option);
                            }
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    
                    // Category
                    _buildSectionTitle('Category'),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: const Text('All'),
                          selected: _selectedCategory == null,
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => _selectedCategory = null);
                            }
                          },
                        ),
                        ...ListingCategory.values.map((category) {
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
                              setState(() {
                                _selectedCategory = selected ? category : null;
                              });
                            },
                          );
                        }),
                      ],
                    ),
                    const SizedBox(height: 20),
                    
                    // Condition
                    _buildSectionTitle('Condition'),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: const Text('Any'),
                          selected: _selectedCondition == null,
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => _selectedCondition = null);
                            }
                          },
                        ),
                        ...ListingCondition.values.map((condition) {
                          return ChoiceChip(
                            label: Text(condition.displayName),
                            selected: _selectedCondition == condition,
                            onSelected: (selected) {
                              setState(() {
                                _selectedCondition = selected ? condition : null;
                              });
                            },
                          );
                        }),
                      ],
                    ),
                    const SizedBox(height: 20),
                    
                    // Price Range
                    _buildSectionTitle('Price Range'),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _minPriceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Min',
                              prefixText: '\$',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                            ),
                            onChanged: (value) {
                              final price = double.tryParse(value) ?? 0;
                              setState(() {
                                _priceRange = RangeValues(
                                  price,
                                  _priceRange.end,
                                );
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _maxPriceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Max',
                              prefixText: '\$',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                            ),
                            onChanged: (value) {
                              final price = double.tryParse(value) ?? 10000;
                              setState(() {
                                _priceRange = RangeValues(
                                  _priceRange.start,
                                  price,
                                );
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    RangeSlider(
                      values: _priceRange,
                      min: 0,
                      max: 10000,
                      divisions: 100,
                      labels: RangeLabels(
                        '\$${_priceRange.start.toStringAsFixed(0)}',
                        '\$${_priceRange.end.toStringAsFixed(0)}',
                      ),
                      onChanged: (values) {
                        setState(() {
                          _priceRange = values;
                          _minPriceController.text = values.start.toStringAsFixed(0);
                          _maxPriceController.text = values.end.toStringAsFixed(0);
                        });
                      },
                    ),
                    const SizedBox(height: 20),
                    
                    // Location
                    _buildSectionTitle('Location'),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _location ?? 'Any Location',
                            style: TextStyle(
                              color: _location != null
                                  ? Colors.black
                                  : Colors.grey[600],
                            ),
                          ),
                        ),
                        CustomButton(
                          text: 'Use Current',
                          size: ButtonSize.small,
                          isLoading: _isLoadingLocation,
                          onPressed: _getCurrentLocation,
                        ),
                      ],
                    ),
                    if (_location != null) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _maxDistanceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Max Distance (km)',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _maxDistance = double.tryParse(value);
                          });
                        },
                      ),
                    ],
                    const SizedBox(height: 20),
                    
                    // Shipping
                    _buildSectionTitle('Shipping'),
                    Row(
                      children: [
                        Expanded(
                          child: RadioListTile<bool?>(
                            title: const Text('All'),
                            value: null,
                            groupValue: _shippingAvailable,
                            onChanged: (value) {
                              setState(() => _shippingAvailable = value);
                            },
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                        Expanded(
                          child: RadioListTile<bool?>(
                            title: const Text('Available'),
                            value: true,
                            groupValue: _shippingAvailable,
                            onChanged: (value) {
                              setState(() => _shippingAvailable = value);
                            },
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // Actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Cancel',
                      variant: ButtonVariant.outline,
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: 'Apply Filters',
                      onPressed: _applyFilters,
                    ),
                  ),
                ],
              ),
            ),
          ],
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