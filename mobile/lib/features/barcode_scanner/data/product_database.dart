import '../models/product.dart';

class ProductDatabase {
  static final Map<String, Product> _products = {
    // Fish Food
    '0123456789012': Product(
      id: 'prod_001',
      barcode: '0123456789012',
      name: 'TetraMin Tropical Flakes',
      brand: 'Tetra',
      description: 'Complete diet for tropical fish with ProCare formula',
      category: ProductCategory.food,
      price: 12.99,
      imageUrl: 'https://example.com/tetramin.jpg',
      specifications: {
        'weight': '200g',
        'type': 'Flakes',
        'protein': '47%',
        'fat': '10%',
        'fiber': '3%',
        'moisture': '6%',
      },
      tags: ['tropical', 'flakes', 'vitamins', 'color-enhancing'],
      rating: 4.6,
      reviewCount: 1234,
    ),
    '0234567890123': Product(
      id: 'prod_002',
      barcode: '0234567890123',
      name: 'Hikari Bio-Gold',
      brand: 'Hikari',
      description: 'Premium daily diet for goldfish with probiotics',
      category: ProductCategory.food,
      price: 15.99,
      specifications: {
        'weight': '100g',
        'type': 'Pellets',
        'protein': '42%',
        'size': '3mm',
      },
      tags: ['goldfish', 'pellets', 'probiotics', 'floating'],
      rating: 4.8,
      reviewCount: 892,
    ),
    
    // Water Conditioners
    '1234567890123': Product(
      id: 'prod_003',
      barcode: '1234567890123',
      name: 'Seachem Prime',
      brand: 'Seachem',
      description: 'Complete and concentrated conditioner for fresh and saltwater',
      category: ProductCategory.waterConditioner,
      price: 14.95,
      specifications: {
        'volume': '500ml',
        'concentration': '5ml treats 200L',
        'removes': 'Chlorine, Chloramine, Ammonia',
      },
      tags: ['dechlorinator', 'ammonia-detoxifier', 'concentrated'],
      rating: 4.9,
      reviewCount: 3456,
    ),
    '1345678901234': Product(
      id: 'prod_004',
      barcode: '1345678901234',
      name: 'API Stress Coat',
      brand: 'API',
      description: 'Water conditioner with aloe vera for fish stress relief',
      category: ProductCategory.waterConditioner,
      price: 9.99,
      specifications: {
        'volume': '473ml',
        'treats': '3,785L',
        'features': 'Aloe vera, slime coat protection',
      },
      tags: ['stress-relief', 'aloe-vera', 'slime-coat'],
      rating: 4.5,
      reviewCount: 2167,
    ),
    
    // Test Kits
    '2345678901234': Product(
      id: 'prod_005',
      barcode: '2345678901234',
      name: 'API Master Test Kit',
      brand: 'API',
      description: 'Tests pH, ammonia, nitrite & nitrate in freshwater aquariums',
      category: ProductCategory.testKit,
      price: 32.99,
      specifications: {
        'tests': '800+',
        'parameters': 'pH, NH3, NO2, NO3',
        'type': 'Liquid reagent',
        'accuracy': 'Laboratory grade',
      },
      tags: ['master-kit', 'freshwater', 'complete-testing'],
      rating: 4.7,
      reviewCount: 5678,
    ),
    
    // Medications
    '3456789012345': Product(
      id: 'prod_006',
      barcode: '3456789012345',
      name: 'Ich-X',
      brand: 'Hikari',
      description: 'Effective treatment for ich and other external parasites',
      category: ProductCategory.medication,
      price: 19.99,
      specifications: {
        'volume': '473ml',
        'treats': '5,000 gallons',
        'active': 'Malachite Green, Formaldehyde',
        'safe': 'Invertebrate safe',
      },
      tags: ['ich-treatment', 'parasite', 'reef-safe'],
      rating: 4.6,
      reviewCount: 1892,
    ),
    
    // Equipment
    '4567890123456': Product(
      id: 'prod_007',
      barcode: '4567890123456',
      name: 'Fluval 307 Canister Filter',
      brand: 'Fluval',
      description: 'High-performance canister filter for aquariums up to 70 gallons',
      category: ProductCategory.filter,
      price: 189.99,
      specifications: {
        'flow': '303 GPH',
        'aquarium': 'Up to 70 gallons',
        'media': 'Multi-stage filtration',
        'power': '16W',
      },
      tags: ['canister', 'quiet', 'multi-stage'],
      rating: 4.8,
      reviewCount: 3421,
    ),
    
    // Decorations
    '5678901234567': Product(
      id: 'prod_008',
      barcode: '5678901234567',
      name: 'Natural Driftwood Medium',
      brand: 'Zoo Med',
      description: 'Natural Malaysian driftwood for aquariums',
      category: ProductCategory.decoration,
      price: 24.99,
      specifications: {
        'size': '12-16 inches',
        'type': 'Malaysian driftwood',
        'preparation': 'Pre-soaked',
      },
      tags: ['natural', 'driftwood', 'aquascaping'],
      rating: 4.4,
      reviewCount: 678,
    ),
    
    // Plants
    '6789012345678': Product(
      id: 'prod_009',
      barcode: '6789012345678',
      name: 'Java Fern Bundle',
      brand: 'Aquarium Plants Factory',
      description: 'Easy care live aquarium plant, great for beginners',
      category: ProductCategory.plant,
      price: 12.99,
      specifications: {
        'quantity': '3-5 plants',
        'height': '6-10 inches',
        'care': 'Low light, no CO2',
        'growth': 'Slow to moderate',
      },
      tags: ['live-plant', 'beginner', 'low-light'],
      rating: 4.5,
      reviewCount: 1234,
    ),
    
    // Lighting
    '7890123456789': Product(
      id: 'prod_010',
      barcode: '7890123456789',
      name: 'NICREW ClassicLED Plus',
      brand: 'NICREW',
      description: 'Full spectrum LED light for planted aquariums',
      category: ProductCategory.lighting,
      price: 39.99,
      specifications: {
        'length': '28-36 inches',
        'watts': '18W',
        'spectrum': 'Full spectrum 6500K',
        'timer': 'Built-in timer',
      },
      tags: ['led', 'planted-tank', 'timer', 'adjustable'],
      rating: 4.6,
      reviewCount: 4567,
    ),
    
    // Heating
    '8901234567890': Product(
      id: 'prod_011',
      barcode: '8901234567890',
      name: 'Eheim Jager 150W Heater',
      brand: 'Eheim',
      description: 'Precision aquarium heater with TruTemp dial',
      category: ProductCategory.heating,
      price: 34.99,
      specifications: {
        'wattage': '150W',
        'aquarium': '40-53 gallons',
        'accuracy': '+/- 0.5°F',
        'safety': 'Auto shut-off',
      },
      tags: ['heater', 'precision', 'german-made'],
      rating: 4.7,
      reviewCount: 2345,
    ),
    
    // Cleaning
    '9012345678901': Product(
      id: 'prod_012',
      barcode: '9012345678901',
      name: 'Python No Spill Water Changer',
      brand: 'Python',
      description: 'Complete aquarium water changing system',
      category: ProductCategory.cleaning,
      price: 54.99,
      specifications: {
        'length': '25 feet',
        'connection': 'Faucet adapter included',
        'flow': 'Adjustable flow control',
      },
      tags: ['water-changer', 'gravel-vacuum', 'no-spill'],
      rating: 4.8,
      reviewCount: 3678,
    ),
  };

  static Product? getProduct(String barcode) {
    return _products[barcode];
  }

  static List<Product> searchProducts(String query) {
    final searchQuery = query.toLowerCase();
    return _products.values.where((product) =>
      product.name.toLowerCase().contains(searchQuery) ||
      (product.brand?.toLowerCase().contains(searchQuery) ?? false) ||
      product.tags.any((tag) => tag.contains(searchQuery))
    ).toList();
  }

  static List<Product> getProductsByCategory(ProductCategory category) {
    return _products.values
        .where((product) => product.category == category)
        .toList();
  }

  static List<Product> getPopularProducts() {
    final products = _products.values.toList();
    products.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
    return products.take(10).toList();
  }
}