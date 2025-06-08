import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/product.dart';
import '../services/barcode_service.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final String? aquariumId;

  const BarcodeScannerScreen({
    super.key,
    this.aquariumId,
  });

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  bool _isFlashOn = false;
  bool _isFrontCamera = false;
  String? _lastScannedBarcode;
  bool _canScan = true;
  
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    
    _animation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    _initializeScanner();
  }

  @override
  void dispose() {
    _animationController.dispose();
    BarcodeService.disposeScanner();
    super.dispose();
  }

  Future<void> _initializeScanner() async {
    try {
      await BarcodeService.initializeScanner();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to initialize scanner: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_canScan) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    
    final barcode = barcodes.first;
    if (barcode.rawValue == null || barcode.rawValue == _lastScannedBarcode) {
      return;
    }
    
    setState(() {
      _canScan = false;
      _lastScannedBarcode = barcode.rawValue;
    });
    
    // Haptic feedback
    // HapticFeedback.mediumImpact();
    
    await _processBarcode(barcode.rawValue!);
  }

  Future<void> _processBarcode(String barcode) async {
    setState(() => _isLoading = true);
    
    try {
      final product = await BarcodeService.lookupProduct(barcode);
      
      if (!mounted) return;
      
      setState(() => _isLoading = false);
      
      if (product != null) {
        // Product found
        _showProductFound(product);
      } else {
        // Product not found
        _showProductNotFound(barcode);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
      
      // Allow scanning again after error
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _canScan = true;
            _lastScannedBarcode = null;
          });
        }
      });
    }
  }

  void _showProductFound(Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ProductFoundSheet(
        product: product,
        aquariumId: widget.aquariumId,
        onAddToInventory: () {
          Navigator.pop(context);
          context.push('/add-product/${product.barcode}', extra: {
            'product': product,
            'aquariumId': widget.aquariumId,
          });
        },
        onViewDetails: () {
          Navigator.pop(context);
          context.push('/product/${product.id}', extra: product);
        },
        onScanAgain: () {
          Navigator.pop(context);
          setState(() {
            _canScan = true;
            _lastScannedBarcode = null;
          });
        },
      ),
    );
  }

  void _showProductNotFound(String barcode) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _ProductNotFoundSheet(
        barcode: barcode,
        onManualAdd: () {
          Navigator.pop(context);
          context.push('/add-product/manual', extra: {
            'barcode': barcode,
            'aquariumId': widget.aquariumId,
          });
        },
        onScanAgain: () {
          Navigator.pop(context);
          setState(() {
            _canScan = true;
            _lastScannedBarcode = null;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Stack(
          children: [
            // Camera View
            MobileScanner(
              controller: BarcodeService.scannerController,
              onDetect: _onDetect,
            ),
            
            // Scanning Overlay
            _buildScanningOverlay(),
            
            // Top Controls
            _buildTopControls(),
            
            // Bottom Instructions
            _buildBottomInstructions(),
          ],
        ),
      ),
    );
  }

  Widget _buildScanningOverlay() {
    return Center(
      child: Stack(
        children: [
          // Scanning Frame
          Container(
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.white.withOpacity(0.5),
                width: 2,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          
          // Corner Accents
          ..._buildCornerAccents(),
          
          // Scanning Line Animation
          if (_canScan)
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                return Positioned(
                  top: 20 + (_animation.value * 240),
                  left: 20,
                  right: 20,
                  child: Container(
                    height: 2,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          AppTheme.secondaryColor,
                          AppTheme.secondaryColor,
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.2, 0.8, 1.0],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.secondaryColor.withOpacity(0.5),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  List<Widget> _buildCornerAccents() {
    const cornerSize = 30.0;
    const cornerThickness = 4.0;
    
    return [
      // Top Left
      Positioned(
        top: 0,
        left: 0,
        child: Container(
          width: cornerSize,
          height: cornerThickness,
          color: AppTheme.secondaryColor,
        ),
      ),
      Positioned(
        top: 0,
        left: 0,
        child: Container(
          width: cornerThickness,
          height: cornerSize,
          color: AppTheme.secondaryColor,
        ),
      ),
      
      // Top Right
      Positioned(
        top: 0,
        right: 0,
        child: Container(
          width: cornerSize,
          height: cornerThickness,
          color: AppTheme.secondaryColor,
        ),
      ),
      Positioned(
        top: 0,
        right: 0,
        child: Container(
          width: cornerThickness,
          height: cornerSize,
          color: AppTheme.secondaryColor,
        ),
      ),
      
      // Bottom Left
      Positioned(
        bottom: 0,
        left: 0,
        child: Container(
          width: cornerSize,
          height: cornerThickness,
          color: AppTheme.secondaryColor,
        ),
      ),
      Positioned(
        bottom: 0,
        left: 0,
        child: Container(
          width: cornerThickness,
          height: cornerSize,
          color: AppTheme.secondaryColor,
        ),
      ),
      
      // Bottom Right
      Positioned(
        bottom: 0,
        right: 0,
        child: Container(
          width: cornerSize,
          height: cornerThickness,
          color: AppTheme.secondaryColor,
        ),
      ),
      Positioned(
        bottom: 0,
        right: 0,
        child: Container(
          width: cornerThickness,
          height: cornerSize,
          color: AppTheme.secondaryColor,
        ),
      ),
    ];
  }

  Widget _buildTopControls() {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 16,
      left: 16,
      right: 16,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Close Button
          IconButton(
            icon: const Icon(Icons.close),
            color: Colors.white,
            iconSize: 28,
            onPressed: () => context.pop(),
          ),
          
          // Title
          Text(
            'Scan Product',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          // Flash Toggle
          IconButton(
            icon: Icon(_isFlashOn ? Icons.flash_on : Icons.flash_off),
            color: Colors.white,
            iconSize: 28,
            onPressed: () async {
              await BarcodeService.toggleTorch();
              setState(() {
                _isFlashOn = !_isFlashOn;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBottomInstructions() {
    return Positioned(
      bottom: MediaQuery.of(context).padding.bottom + 32,
      left: 32,
      right: 32,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: BorderRadius.circular(25),
            ),
            child: Text(
              _canScan 
                  ? 'Position barcode within frame'
                  : 'Processing...',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Manual Entry
              TextButton.icon(
                onPressed: () {
                  context.push('/add-product/manual', extra: {
                    'aquariumId': widget.aquariumId,
                  });
                },
                icon: const Icon(Icons.keyboard, color: Colors.white),
                label: const Text(
                  'Manual Entry',
                  style: TextStyle(color: Colors.white),
                ),
              ),
              
              // History
              TextButton.icon(
                onPressed: () {
                  context.push('/scan-history');
                },
                icon: const Icon(Icons.history, color: Colors.white),
                label: const Text(
                  'History',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Product Found Bottom Sheet
class _ProductFoundSheet extends StatelessWidget {
  final Product product;
  final String? aquariumId;
  final VoidCallback onAddToInventory;
  final VoidCallback onViewDetails;
  final VoidCallback onScanAgain;

  const _ProductFoundSheet({
    required this.product,
    this.aquariumId,
    required this.onAddToInventory,
    required this.onViewDetails,
    required this.onScanAgain,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 5,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.greyColor,
              borderRadius: BorderRadius.circular(2.5),
            ),
          ),
          
          // Success Icon
          const SizedBox(height: 24),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.successColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.check_circle,
              size: 48,
              color: AppTheme.successColor,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Product Found Text
          Text(
            'Product Found!',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppTheme.successColor,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Product Info
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.greyColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                // Product Icon
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: product.category.color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    product.category.icon,
                    color: product.category.color,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                
                // Product Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (product.brand != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          product.brand!,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          if (product.price != null) ...[
                            Text(
                              '\$${product.price!.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: product.category.color.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              product.category.displayName,
                              style: TextStyle(
                                fontSize: 12,
                                color: product.category.color,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                if (aquariumId != null)
                  CustomButton(
                    text: 'Add to Inventory',
                    icon: Icons.add_shopping_cart,
                    onPressed: onAddToInventory,
                  ),
                const SizedBox(height: 12),
                CustomButton(
                  text: 'View Details',
                  icon: Icons.info_outline,
                  variant: ButtonVariant.outline,
                  onPressed: onViewDetails,
                ),
                const SizedBox(height: 12),
                CustomButton(
                  text: 'Scan Another',
                  icon: Icons.qr_code_scanner,
                  variant: ButtonVariant.text,
                  onPressed: onScanAgain,
                ),
              ],
            ),
          ),
          
          SizedBox(height: MediaQuery.of(context).padding.bottom + 20),
        ],
      ),
    );
  }
}

// Product Not Found Bottom Sheet
class _ProductNotFoundSheet extends StatelessWidget {
  final String barcode;
  final VoidCallback onManualAdd;
  final VoidCallback onScanAgain;

  const _ProductNotFoundSheet({
    required this.barcode,
    required this.onManualAdd,
    required this.onScanAgain,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 5,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.greyColor,
              borderRadius: BorderRadius.circular(2.5),
            ),
          ),
          
          // Not Found Icon
          const SizedBox(height: 24),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.warningColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.search_off,
              size: 48,
              color: AppTheme.warningColor,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Not Found Text
          Text(
            'Product Not Found',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            'Barcode: $barcode',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'This product is not in our database yet. You can add it manually to track it in your inventory.',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                CustomButton(
                  text: 'Add Manually',
                  icon: Icons.edit,
                  onPressed: onManualAdd,
                ),
                const SizedBox(height: 12),
                CustomButton(
                  text: 'Scan Another',
                  icon: Icons.qr_code_scanner,
                  variant: ButtonVariant.outline,
                  onPressed: onScanAgain,
                ),
              ],
            ),
          ),
          
          SizedBox(height: MediaQuery.of(context).padding.bottom + 20),
        ],
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