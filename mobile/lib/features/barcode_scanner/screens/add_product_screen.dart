import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/product.dart';
import '../services/barcode_service.dart';
import '../../aquarium/services/aquarium_service.dart';
import '../../expenses/services/expense_service.dart';

class AddProductScreen extends StatefulWidget {
  final String? barcode;
  final Product? product;
  final String? aquariumId;

  const AddProductScreen({
    super.key,
    this.barcode,
    this.product,
    this.aquariumId,
  });

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _priceController = TextEditingController();
  final _quantityController = TextEditingController();
  final _unitController = TextEditingController();
  final _storeController = TextEditingController();
  final _notesController = TextEditingController();
  
  ProductCategory _selectedCategory = ProductCategory.other;
  DateTime _purchaseDate = DateTime.now();
  DateTime? _expiryDate;
  List<File> _photos = [];
  String? _selectedAquariumId;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedAquariumId = widget.aquariumId;
    
    if (widget.product != null) {
      // Pre-fill from existing product
      _nameController.text = widget.product!.name;
      _brandController.text = widget.product!.brand ?? '';
      _barcodeController.text = widget.product!.barcode;
      _priceController.text = widget.product!.price?.toStringAsFixed(2) ?? '';
      _selectedCategory = widget.product!.category;
    } else if (widget.barcode != null) {
      // Just the barcode
      _barcodeController.text = widget.barcode!;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _barcodeController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    _unitController.dispose();
    _storeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectPurchaseDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _purchaseDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    
    if (date != null) {
      setState(() {
        _purchaseDate = date;
      });
    }
  }

  Future<void> _selectExpiryDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _expiryDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 1825)), // 5 years
    );
    
    if (date != null) {
      setState(() {
        _expiryDate = date;
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    
    if (image != null) {
      setState(() {
        _photos.add(File(image.path));
      });
    }
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedAquariumId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please select an aquarium'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      // Create or use existing product
      final product = widget.product ?? Product(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        barcode: _barcodeController.text,
        name: _nameController.text,
        brand: _brandController.text.isEmpty ? null : _brandController.text,
        category: _selectedCategory,
        price: double.tryParse(_priceController.text),
      );
      
      // Save scanned product
      final scannedProduct = await BarcodeService.saveScannedProduct(
        product: product,
        aquariumId: _selectedAquariumId!,
        quantity: double.parse(_quantityController.text),
        unit: _unitController.text.isEmpty ? null : _unitController.text,
        purchasePrice: double.parse(_priceController.text),
        purchaseDate: _purchaseDate,
        store: _storeController.text.isEmpty ? null : _storeController.text,
        notes: _notesController.text.isEmpty ? null : _notesController.text,
        expiryDate: _expiryDate,
        photos: _photos.map((f) => f.path).toList(),
      );
      
      if (mounted) {
        // Ask if user wants to create expense
        final createExpense = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Create Expense?'),
            content: const Text('Would you like to record this purchase as an expense?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('No'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Yes'),
              ),
            ],
          ),
        );

        if (createExpense == true) {
          await ExpenseService.createExpenseFromProduct(
            scannedProduct: scannedProduct,
          );
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Product added to inventory'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product != null ? 'Add to Inventory' : 'Add Product'),
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
              // Product Info Section
              Text(
                'Product Information',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // Barcode
              CustomTextField(
                label: 'Barcode',
                controller: _barcodeController,
                enabled: widget.product == null,
                prefixIcon: Icons.qr_code,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter barcode';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Name
              CustomTextField(
                label: 'Product Name',
                controller: _nameController,
                enabled: widget.product == null,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter product name';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Brand
              CustomTextField(
                label: 'Brand (Optional)',
                controller: _brandController,
                enabled: widget.product == null,
              ),
              
              const SizedBox(height: 16),
              
              // Category
              Text(
                'Category',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.greyColor),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<ProductCategory>(
                    value: _selectedCategory,
                    isExpanded: true,
                    onChanged: widget.product == null
                        ? (value) {
                            if (value != null) {
                              setState(() {
                                _selectedCategory = value;
                              });
                            }
                          }
                        : null,
                    items: ProductCategory.values.map((category) {
                      return DropdownMenuItem(
                        value: category,
                        child: Row(
                          children: [
                            Icon(
                              category.icon,
                              size: 20,
                              color: category.color,
                            ),
                            const SizedBox(width: 12),
                            Text(category.displayName),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Purchase Info Section
              Text(
                'Purchase Information',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // Aquarium Selection
              FutureBuilder<List<dynamic>>(
                future: AquariumService.getAquariums(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const CircularProgressIndicator();
                  }
                  
                  final aquariums = snapshot.data!;
                  
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Aquarium',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.greyColor),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedAquariumId,
                            hint: const Text('Select aquarium'),
                            isExpanded: true,
                            onChanged: (value) {
                              setState(() {
                                _selectedAquariumId = value;
                              });
                            },
                            items: aquariums.map((aquarium) {
                              return DropdownMenuItem(
                                value: aquarium.id,
                                child: Text(aquarium.name),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
              
              const SizedBox(height: 16),
              
              // Quantity and Unit
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: CustomTextField(
                      label: 'Quantity',
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Required';
                        }
                        if (double.tryParse(value) == null) {
                          return 'Invalid';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CustomTextField(
                      label: 'Unit',
                      controller: _unitController,
                      placeholder: 'e.g., oz, g',
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Price
              CustomTextField(
                label: 'Purchase Price',
                controller: _priceController,
                keyboardType: TextInputType.number,
                prefixIcon: Icons.attach_money,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter price';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Invalid price';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Purchase Date
              InkWell(
                onTap: _selectPurchaseDate,
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Purchase Date',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    suffixIcon: const Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    DateFormat('MMMM d, yyyy').format(_purchaseDate),
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Store
              CustomTextField(
                label: 'Store (Optional)',
                controller: _storeController,
                prefixIcon: Icons.store,
              ),
              
              const SizedBox(height: 16),
              
              // Expiry Date (for certain categories)
              if (_selectedCategory == ProductCategory.food ||
                  _selectedCategory == ProductCategory.medication ||
                  _selectedCategory == ProductCategory.waterConditioner ||
                  _selectedCategory == ProductCategory.testKit) ...[
                InkWell(
                  onTap: _selectExpiryDate,
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Expiry Date (Optional)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_expiryDate != null)
                            IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                setState(() {
                                  _expiryDate = null;
                                });
                              },
                            ),
                          const Icon(Icons.calendar_today),
                        ],
                      ),
                    ),
                    child: Text(
                      _expiryDate != null
                          ? DateFormat('MMMM d, yyyy').format(_expiryDate!)
                          : 'Not set',
                      style: TextStyle(
                        color: _expiryDate != null
                            ? null
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              
              // Notes
              CustomTextField(
                label: 'Notes (Optional)',
                controller: _notesController,
                maxLines: 3,
              ),
              
              const SizedBox(height: 24),
              
              // Photos Section
              Text(
                'Photos',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // Photo Grid
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: _photos.length + 1,
                itemBuilder: (context, index) {
                  if (index == _photos.length) {
                    // Add photo button
                    return InkWell(
                      onTap: _pickImage,
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: AppTheme.greyColor,
                            style: BorderStyle.solid,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_a_photo,
                              color: AppTheme.greyColor,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Add Photo',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  
                  // Photo thumbnail
                  return Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          _photos[index],
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _photos.removeAt(index);
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.5),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.close,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
              
              const SizedBox(height: 32),
              
              // Save Button
              CustomButton(
                text: 'Save to Inventory',
                icon: Icons.save,
                onPressed: _isLoading ? null : _saveProduct,
                isLoading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

extension on ProductCategory {
  Color get color {
    switch (this) {
      case ProductCategory.food:
        return Colors.orange;
      case ProductCategory.medication:
        return Colors.red;
      case ProductCategory.waterConditioner:
        return Colors.blue;
      case ProductCategory.testKit:
        return Colors.purple;
      case ProductCategory.equipment:
        return Colors.grey;
      case ProductCategory.filter:
        return Colors.cyan;
      case ProductCategory.decoration:
        return Colors.brown;
      case ProductCategory.plant:
        return Colors.green;
      case ProductCategory.lighting:
        return Colors.yellow[700]!;
      case ProductCategory.heating:
        return Colors.deepOrange;
      case ProductCategory.cleaning:
        return Colors.teal;
      case ProductCategory.other:
        return Colors.blueGrey;
    }
  }
}