import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/product.dart';
import '../services/barcode_service.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;

  const ProductDetailScreen({
    super.key,
    required this.product,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Product _product;
  List<ScannedProduct> _purchaseHistory = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _product = widget.product;
    _loadPurchaseHistory();
  }

  Future<void> _loadPurchaseHistory() async {
    try {
      final allProducts = await BarcodeService.getAllScannedProducts();
      final history = allProducts
          .where((p) => p.product.barcode == _product.barcode)
          .toList();
      
      setState(() {
        _purchaseHistory = history;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Details'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // TODO: Implement share functionality
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Image
                  if (_product.imageUrl != null)
                    Container(
                      height: 250,
                      width: double.infinity,
                      color: AppTheme.lightGreyColor,
                      child: const Icon(
                        Icons.image,
                        size: 64,
                        color: AppTheme.greyColor,
                      ),
                    )
                  else
                    Container(
                      height: 250,
                      width: double.infinity,
                      color: _product.category.color.withOpacity(0.1),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _product.category.icon,
                            size: 80,
                            color: _product.category.color,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _product.category.displayName,
                            style: TextStyle(
                              fontSize: 16,
                              color: _product.category.color,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  
                  // Product Info
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name and Brand
                        Text(
                          _product.name,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_product.brand != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            _product.brand!,
                            style: TextStyle(
                              fontSize: 16,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                        
                        const SizedBox(height: 16),
                        
                        // Price and Rating
                        Row(
                          children: [
                            if (_product.price != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '\$${_product.price!.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                            ],
                            if (_product.rating != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.amber.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.star,
                                      size: 18,
                                      color: Colors.amber,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _product.rating!.toStringAsFixed(1),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (_product.reviewCount != null) ...[
                                      const SizedBox(width: 4),
                                      Text(
                                        '(${_product.reviewCount})',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                        
                        // Barcode
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.greyColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.qr_code,
                                size: 20,
                                color: AppTheme.textSecondary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Barcode: ${_product.barcode}',
                                style: TextStyle(
                                  fontFamily: 'monospace',
                                  color: AppTheme.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        // Description
                        if (_product.description != null) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Description',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _product.description!,
                            style: TextStyle(
                              height: 1.5,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                        
                        // Specifications
                        if (_product.specifications != null && 
                            _product.specifications!.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Specifications',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._product.specifications!.entries.map((entry) => 
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 120,
                                    child: Text(
                                      '${_formatSpecKey(entry.key)}:',
                                      style: TextStyle(
                                        color: AppTheme.textSecondary,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      entry.value.toString(),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        
                        // Tags
                        if (_product.tags.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Tags',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _product.tags.map((tag) => 
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.primaryColor.withOpacity(0.3),
                                  ),
                                ),
                                child: Text(
                                  tag,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                            ).toList(),
                          ),
                        ],
                        
                        // Purchase History
                        if (_purchaseHistory.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Purchase History',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._purchaseHistory.map((purchase) => 
                            Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _product.category.color.withOpacity(0.1),
                                  child: Icon(
                                    Icons.shopping_cart,
                                    color: _product.category.color,
                                    size: 20,
                                  ),
                                ),
                                title: Text(
                                  '${purchase.quantity} ${purchase.unit ?? 'units'} - \$${purchase.purchasePrice.toStringAsFixed(2)}',
                                  style: const TextStyle(fontWeight: FontWeight.w500),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      DateFormat('MMM d, yyyy').format(purchase.purchaseDate),
                                    ),
                                    if (purchase.store != null)
                                      Text(
                                        purchase.store!,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: purchase.expiryDate != null &&
                                        purchase.expiryDate!.isAfter(DateTime.now())
                                    ? Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: _getExpiryColor(purchase.expiryDate!).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          'Expires ${DateFormat('MMM d').format(purchase.expiryDate!)}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: _getExpiryColor(purchase.expiryDate!),
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                          ),
                        ],
                        
                        const SizedBox(height: 24),
                        
                        // Action Buttons
                        CustomButton(
                          text: 'Add to Inventory',
                          icon: Icons.add_shopping_cart,
                          onPressed: () {
                            context.push('/add-product/${_product.barcode}', extra: {
                              'product': _product,
                            });
                          },
                        ),
                        
                        const SizedBox(height: 12),
                        
                        CustomButton(
                          text: 'Scan Another Product',
                          icon: Icons.qr_code_scanner,
                          variant: ButtonVariant.outline,
                          onPressed: () {
                            context.go('/barcode-scanner');
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  String _formatSpecKey(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isEmpty ? '' : 
             '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
  }

  Color _getExpiryColor(DateTime expiryDate) {
    final daysUntilExpiry = expiryDate.difference(DateTime.now()).inDays;
    if (daysUntilExpiry <= 7) return AppTheme.errorColor;
    if (daysUntilExpiry <= 30) return AppTheme.warningColor;
    return AppTheme.successColor;
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