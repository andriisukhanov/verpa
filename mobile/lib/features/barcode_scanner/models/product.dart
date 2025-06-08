import 'package:equatable/equatable.dart';

class Product extends Equatable {
  final String id;
  final String barcode;
  final String name;
  final String? brand;
  final String? description;
  final ProductCategory category;
  final double? price;
  final String? currency;
  final String? imageUrl;
  final Map<String, dynamic>? specifications;
  final List<String> tags;
  final DateTime? lastScanned;
  final int scanCount;
  final double? rating;
  final int? reviewCount;

  const Product({
    required this.id,
    required this.barcode,
    required this.name,
    this.brand,
    this.description,
    required this.category,
    this.price,
    this.currency = 'USD',
    this.imageUrl,
    this.specifications,
    this.tags = const [],
    this.lastScanned,
    this.scanCount = 0,
    this.rating,
    this.reviewCount,
  });

  Product copyWith({
    String? id,
    String? barcode,
    String? name,
    String? brand,
    String? description,
    ProductCategory? category,
    double? price,
    String? currency,
    String? imageUrl,
    Map<String, dynamic>? specifications,
    List<String>? tags,
    DateTime? lastScanned,
    int? scanCount,
    double? rating,
    int? reviewCount,
  }) {
    return Product(
      id: id ?? this.id,
      barcode: barcode ?? this.barcode,
      name: name ?? this.name,
      brand: brand ?? this.brand,
      description: description ?? this.description,
      category: category ?? this.category,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      imageUrl: imageUrl ?? this.imageUrl,
      specifications: specifications ?? this.specifications,
      tags: tags ?? this.tags,
      lastScanned: lastScanned ?? this.lastScanned,
      scanCount: scanCount ?? this.scanCount,
      rating: rating ?? this.rating,
      reviewCount: reviewCount ?? this.reviewCount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'barcode': barcode,
      'name': name,
      'brand': brand,
      'description': description,
      'category': category.name,
      'price': price,
      'currency': currency,
      'imageUrl': imageUrl,
      'specifications': specifications,
      'tags': tags,
      'lastScanned': lastScanned?.toIso8601String(),
      'scanCount': scanCount,
      'rating': rating,
      'reviewCount': reviewCount,
    };
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      barcode: json['barcode'],
      name: json['name'],
      brand: json['brand'],
      description: json['description'],
      category: ProductCategory.values.firstWhere(
        (c) => c.name == json['category'],
        orElse: () => ProductCategory.other,
      ),
      price: json['price']?.toDouble(),
      currency: json['currency'] ?? 'USD',
      imageUrl: json['imageUrl'],
      specifications: json['specifications'] != null
          ? Map<String, dynamic>.from(json['specifications'])
          : null,
      tags: List<String>.from(json['tags'] ?? []),
      lastScanned: json['lastScanned'] != null
          ? DateTime.parse(json['lastScanned'])
          : null,
      scanCount: json['scanCount'] ?? 0,
      rating: json['rating']?.toDouble(),
      reviewCount: json['reviewCount'],
    );
  }

  @override
  List<Object?> get props => [
        id,
        barcode,
        name,
        brand,
        description,
        category,
        price,
        currency,
        imageUrl,
        specifications,
        tags,
        lastScanned,
        scanCount,
        rating,
        reviewCount,
      ];
}

enum ProductCategory {
  food('food', 'Fish Food', Icons.restaurant),
  medication('medication', 'Medication', Icons.medical_services),
  waterConditioner('water_conditioner', 'Water Conditioner', Icons.water_drop),
  testKit('test_kit', 'Test Kit', Icons.science),
  equipment('equipment', 'Equipment', Icons.settings),
  filter('filter', 'Filter & Media', Icons.air),
  decoration('decoration', 'Decoration', Icons.park),
  plant('plant', 'Plants', Icons.grass),
  lighting('lighting', 'Lighting', Icons.lightbulb),
  heating('heating', 'Heating & Cooling', Icons.thermostat),
  cleaning('cleaning', 'Cleaning Supplies', Icons.cleaning_services),
  other('other', 'Other', Icons.category);

  final String name;
  final String displayName;
  final IconData icon;

  const ProductCategory(this.name, this.displayName, this.icon);
}

class ScannedProduct extends Equatable {
  final String id;
  final Product product;
  final String aquariumId;
  final double quantity;
  final String? unit;
  final double purchasePrice;
  final DateTime purchaseDate;
  final String? store;
  final String? notes;
  final DateTime? expiryDate;
  final List<String> photos;

  const ScannedProduct({
    required this.id,
    required this.product,
    required this.aquariumId,
    required this.quantity,
    this.unit,
    required this.purchasePrice,
    required this.purchaseDate,
    this.store,
    this.notes,
    this.expiryDate,
    this.photos = const [],
  });

  ScannedProduct copyWith({
    String? id,
    Product? product,
    String? aquariumId,
    double? quantity,
    String? unit,
    double? purchasePrice,
    DateTime? purchaseDate,
    String? store,
    String? notes,
    DateTime? expiryDate,
    List<String>? photos,
  }) {
    return ScannedProduct(
      id: id ?? this.id,
      product: product ?? this.product,
      aquariumId: aquariumId ?? this.aquariumId,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      purchaseDate: purchaseDate ?? this.purchaseDate,
      store: store ?? this.store,
      notes: notes ?? this.notes,
      expiryDate: expiryDate ?? this.expiryDate,
      photos: photos ?? this.photos,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product': product.toJson(),
      'aquariumId': aquariumId,
      'quantity': quantity,
      'unit': unit,
      'purchasePrice': purchasePrice,
      'purchaseDate': purchaseDate.toIso8601String(),
      'store': store,
      'notes': notes,
      'expiryDate': expiryDate?.toIso8601String(),
      'photos': photos,
    };
  }

  factory ScannedProduct.fromJson(Map<String, dynamic> json) {
    return ScannedProduct(
      id: json['id'],
      product: Product.fromJson(json['product']),
      aquariumId: json['aquariumId'],
      quantity: json['quantity'].toDouble(),
      unit: json['unit'],
      purchasePrice: json['purchasePrice'].toDouble(),
      purchaseDate: DateTime.parse(json['purchaseDate']),
      store: json['store'],
      notes: json['notes'],
      expiryDate: json['expiryDate'] != null
          ? DateTime.parse(json['expiryDate'])
          : null,
      photos: List<String>.from(json['photos'] ?? []),
    );
  }

  @override
  List<Object?> get props => [
        id,
        product,
        aquariumId,
        quantity,
        unit,
        purchasePrice,
        purchaseDate,
        store,
        notes,
        expiryDate,
        photos,
      ];
}