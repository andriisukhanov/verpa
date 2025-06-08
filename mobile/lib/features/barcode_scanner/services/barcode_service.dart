import 'dart:convert';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;

import '../models/product.dart';
import '../data/product_database.dart';

class BarcodeService {
  static const String _productsKey = 'verpa_products';
  static const String _scannedProductsKey = 'verpa_scanned_products';
  static const String _scanHistoryKey = 'verpa_scan_history';
  
  static final _uuid = const Uuid();
  static final MobileScannerController scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  // Initialize scanner
  static Future<void> initializeScanner() async {
    try {
      await scannerController.start();
    } catch (e) {
      throw Exception('Failed to initialize scanner: $e');
    }
  }

  // Dispose scanner
  static Future<void> disposeScanner() async {
    try {
      await scannerController.dispose();
    } catch (e) {
      // Ignore disposal errors
    }
  }

  // Toggle torch
  static Future<void> toggleTorch() async {
    await scannerController.toggleTorch();
  }

  // Switch camera
  static Future<void> switchCamera() async {
    await scannerController.switchCamera();
  }

  // Look up product by barcode
  static Future<Product?> lookupProduct(String barcode) async {
    try {
      // First check local database
      final localProduct = ProductDatabase.getProduct(barcode);
      if (localProduct != null) {
        return localProduct;
      }

      // Then check cached products
      final cachedProduct = await _getCachedProduct(barcode);
      if (cachedProduct != null) {
        return cachedProduct;
      }

      // Finally, try online lookup (mock API call)
      final onlineProduct = await _lookupOnline(barcode);
      if (onlineProduct != null) {
        await _cacheProduct(onlineProduct);
      }
      
      return onlineProduct;
    } catch (e) {
      throw Exception('Failed to lookup product: $e');
    }
  }

  // Mock online product lookup
  static Future<Product?> _lookupOnline(String barcode) async {
    // Simulate API delay
    await Future.delayed(const Duration(seconds: 1));
    
    // In production, this would call a real barcode API
    // For demo, we'll generate mock data based on barcode patterns
    
    // Check if it's a known pattern
    if (barcode.startsWith('0')) {
      // Food products
      return Product(
        id: _uuid.v4(),
        barcode: barcode,
        name: 'Premium Fish Food - ${barcode.substring(barcode.length - 4)}',
        brand: 'AquaBrand',
        description: 'High-quality fish food with essential nutrients',
        category: ProductCategory.food,
        price: 12.99,
        imageUrl: 'https://example.com/fish-food.jpg',
        specifications: {
          'weight': '200g',
          'type': 'Flakes',
          'protein': '45%',
          'fat': '8%',
        },
        tags: ['tropical', 'flakes', 'vitamins'],
        rating: 4.5,
        reviewCount: 234,
      );
    } else if (barcode.startsWith('1')) {
      // Water conditioners
      return Product(
        id: _uuid.v4(),
        barcode: barcode,
        name: 'Water Conditioner - ${barcode.substring(barcode.length - 4)}',
        brand: 'AquaSafe',
        description: 'Removes chlorine and chloramines instantly',
        category: ProductCategory.waterConditioner,
        price: 8.99,
        specifications: {
          'volume': '500ml',
          'treats': '5000L',
          'type': 'Liquid',
        },
        tags: ['conditioner', 'chlorine', 'safe'],
        rating: 4.7,
        reviewCount: 567,
      );
    } else if (barcode.startsWith('2')) {
      // Test kits
      return Product(
        id: _uuid.v4(),
        barcode: barcode,
        name: 'Master Test Kit - ${barcode.substring(barcode.length - 4)}',
        brand: 'TestPro',
        description: 'Complete water testing kit for all parameters',
        category: ProductCategory.testKit,
        price: 29.99,
        specifications: {
          'tests': '800+',
          'parameters': 'pH, NH3, NO2, NO3',
          'type': 'Liquid reagent',
        },
        tags: ['testing', 'water quality', 'master kit'],
        rating: 4.8,
        reviewCount: 892,
      );
    }
    
    // Unknown product
    return null;
  }

  // Cache product locally
  static Future<void> _cacheProduct(Product product) async {
    final prefs = await SharedPreferences.getInstance();
    final productsData = prefs.getString(_productsKey);
    
    final Map<String, dynamic> products = productsData != null
        ? Map<String, dynamic>.from(jsonDecode(productsData))
        : {};
    
    products[product.barcode] = product.toJson();
    
    await prefs.setString(_productsKey, jsonEncode(products));
  }

  // Get cached product
  static Future<Product?> _getCachedProduct(String barcode) async {
    final prefs = await SharedPreferences.getInstance();
    final productsData = prefs.getString(_productsKey);
    
    if (productsData == null) return null;
    
    final Map<String, dynamic> products = jsonDecode(productsData);
    final productData = products[barcode];
    
    return productData != null ? Product.fromJson(productData) : null;
  }

  // Save scanned product to inventory
  static Future<ScannedProduct> saveScannedProduct({
    required Product product,
    required String aquariumId,
    required double quantity,
    String? unit,
    required double purchasePrice,
    DateTime? purchaseDate,
    String? store,
    String? notes,
    DateTime? expiryDate,
    List<String>? photos,
  }) async {
    final scannedProduct = ScannedProduct(
      id: _uuid.v4(),
      product: product,
      aquariumId: aquariumId,
      quantity: quantity,
      unit: unit,
      purchasePrice: purchasePrice,
      purchaseDate: purchaseDate ?? DateTime.now(),
      store: store,
      notes: notes,
      expiryDate: expiryDate,
      photos: photos ?? [],
    );
    
    // Save to storage
    final prefs = await SharedPreferences.getInstance();
    final scannedData = prefs.getString(_scannedProductsKey);
    
    final List<dynamic> scannedProducts = scannedData != null
        ? jsonDecode(scannedData)
        : [];
    
    scannedProducts.add(scannedProduct.toJson());
    
    await prefs.setString(_scannedProductsKey, jsonEncode(scannedProducts));
    
    // Update scan history
    await _updateScanHistory(product);
    
    return scannedProduct;
  }

  // Update scan history
  static Future<void> _updateScanHistory(Product product) async {
    final prefs = await SharedPreferences.getInstance();
    final historyData = prefs.getString(_scanHistoryKey);
    
    final Map<String, dynamic> history = historyData != null
        ? Map<String, dynamic>.from(jsonDecode(historyData))
        : {};
    
    final barcode = product.barcode;
    final scanData = history[barcode] ?? {'count': 0};
    
    scanData['count'] = (scanData['count'] ?? 0) + 1;
    scanData['lastScanned'] = DateTime.now().toIso8601String();
    scanData['productName'] = product.name;
    
    history[barcode] = scanData;
    
    await prefs.setString(_scanHistoryKey, jsonEncode(history));
  }

  // Get scanned products for aquarium
  static Future<List<ScannedProduct>> getScannedProducts(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_scannedProductsKey);
    
    if (data == null) return [];
    
    final List<dynamic> allProducts = jsonDecode(data);
    
    return allProducts
        .map((json) => ScannedProduct.fromJson(json))
        .where((p) => p.aquariumId == aquariumId)
        .toList()
      ..sort((a, b) => b.purchaseDate.compareTo(a.purchaseDate));
  }

  // Get all scanned products
  static Future<List<ScannedProduct>> getAllScannedProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_scannedProductsKey);
    
    if (data == null) return [];
    
    final List<dynamic> allProducts = jsonDecode(data);
    
    return allProducts
        .map((json) => ScannedProduct.fromJson(json))
        .toList()
      ..sort((a, b) => b.purchaseDate.compareTo(a.purchaseDate));
  }

  // Get scan history
  static Future<List<Map<String, dynamic>>> getScanHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_scanHistoryKey);
    
    if (data == null) return [];
    
    final Map<String, dynamic> history = jsonDecode(data);
    
    return history.entries.map((entry) {
      final data = Map<String, dynamic>.from(entry.value);
      data['barcode'] = entry.key;
      return data;
    }).toList()
      ..sort((a, b) {
        final dateA = DateTime.parse(a['lastScanned']);
        final dateB = DateTime.parse(b['lastScanned']);
        return dateB.compareTo(dateA);
      });
  }

  // Delete scanned product
  static Future<void> deleteScannedProduct(String productId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_scannedProductsKey);
    
    if (data == null) return;
    
    final List<dynamic> products = jsonDecode(data);
    products.removeWhere((p) => p['id'] == productId);
    
    await prefs.setString(_scannedProductsKey, jsonEncode(products));
  }

  // Get product statistics
  static Future<Map<String, dynamic>> getProductStatistics() async {
    final allProducts = await getAllScannedProducts();
    
    if (allProducts.isEmpty) {
      return {
        'totalProducts': 0,
        'totalSpent': 0.0,
        'categoryCounts': <ProductCategory, int>{},
        'monthlySpending': <String, double>{},
        'topCategories': <ProductCategory>[],
        'expiringProducts': 0,
      };
    }
    
    // Calculate total spent
    double totalSpent = 0;
    for (final product in allProducts) {
      totalSpent += product.purchasePrice;
    }
    
    // Count by category
    final categoryCounts = <ProductCategory, int>{};
    for (final product in allProducts) {
      categoryCounts[product.product.category] = 
          (categoryCounts[product.product.category] ?? 0) + 1;
    }
    
    // Monthly spending
    final monthlySpending = <String, double>{};
    for (final product in allProducts) {
      final monthKey = '${product.purchaseDate.year}-${product.purchaseDate.month.toString().padLeft(2, '0')}';
      monthlySpending[monthKey] = 
          (monthlySpending[monthKey] ?? 0) + product.purchasePrice;
    }
    
    // Top categories
    final topCategories = categoryCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    
    // Expiring products
    final now = DateTime.now();
    final expiringProducts = allProducts.where((p) => 
      p.expiryDate != null && 
      p.expiryDate!.difference(now).inDays <= 30 &&
      p.expiryDate!.isAfter(now)
    ).length;
    
    return {
      'totalProducts': allProducts.length,
      'totalSpent': totalSpent,
      'categoryCounts': categoryCounts,
      'monthlySpending': monthlySpending,
      'topCategories': topCategories.take(3).map((e) => e.key).toList(),
      'expiringProducts': expiringProducts,
    };
  }

  // Search products
  static Future<List<Product>> searchProducts(String query) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_productsKey);
    
    if (data == null) return [];
    
    final Map<String, dynamic> products = jsonDecode(data);
    final searchQuery = query.toLowerCase();
    
    return products.values
        .map((json) => Product.fromJson(json))
        .where((product) =>
            product.name.toLowerCase().contains(searchQuery) ||
            (product.brand?.toLowerCase().contains(searchQuery) ?? false) ||
            product.barcode.contains(searchQuery) ||
            product.tags.any((tag) => tag.toLowerCase().contains(searchQuery))
        )
        .toList();
  }
}