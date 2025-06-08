import 'package:flutter/material.dart';

enum ListingCategory {
  equipment('equipment', 'Equipment', Icons.settings),
  fish('fish', 'Fish', Icons.pets),
  plants('plants', 'Plants', Icons.local_florist),
  food('food', 'Food', Icons.restaurant),
  chemicals('chemicals', 'Chemicals', Icons.science),
  decorations('decorations', 'Decorations', Icons.landscape),
  other('other', 'Other', Icons.category);

  final String value;
  final String displayName;
  final IconData icon;

  const ListingCategory(this.value, this.displayName, this.icon);
}

enum ListingCondition {
  new_('new', 'New'),
  likeNew('like_new', 'Like New'),
  good('good', 'Good'),
  fair('fair', 'Fair'),
  forParts('for_parts', 'For Parts');

  final String value;
  final String displayName;

  const ListingCondition(this.value, this.displayName);
}

enum ListingStatus {
  draft('draft', 'Draft'),
  active('active', 'Active'),
  sold('sold', 'Sold'),
  expired('expired', 'Expired'),
  removed('removed', 'Removed');

  final String value;
  final String displayName;

  const ListingStatus(this.value, this.displayName);
}

class MarketplaceListing {
  final String id;
  final String sellerId;
  final String sellerName;
  final String? sellerAvatar;
  final double sellerRating;
  final int sellerReviews;
  final String title;
  final String description;
  final ListingCategory category;
  final ListingCondition condition;
  final double price;
  final String currency;
  final List<String> images;
  final String location;
  final double? latitude;
  final double? longitude;
  final bool shippingAvailable;
  final double? shippingCost;
  final ListingStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? expiresAt;
  final int views;
  final int favorites;
  final Map<String, dynamic>? specifications;
  final List<String> tags;

  MarketplaceListing({
    required this.id,
    required this.sellerId,
    required this.sellerName,
    this.sellerAvatar,
    this.sellerRating = 0.0,
    this.sellerReviews = 0,
    required this.title,
    required this.description,
    required this.category,
    required this.condition,
    required this.price,
    this.currency = 'USD',
    required this.images,
    required this.location,
    this.latitude,
    this.longitude,
    this.shippingAvailable = false,
    this.shippingCost,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.expiresAt,
    this.views = 0,
    this.favorites = 0,
    this.specifications,
    this.tags = const [],
  });

  String get mainImage => images.isNotEmpty ? images.first : '';
  
  bool get isActive => status == ListingStatus.active;
  
  bool get isExpired => 
      status == ListingStatus.expired || 
      (expiresAt != null && DateTime.now().isAfter(expiresAt!));

  double get totalPrice => price + (shippingCost ?? 0);

  Map<String, dynamic> toJson() => {
    'id': id,
    'sellerId': sellerId,
    'sellerName': sellerName,
    'sellerAvatar': sellerAvatar,
    'sellerRating': sellerRating,
    'sellerReviews': sellerReviews,
    'title': title,
    'description': description,
    'category': category.value,
    'condition': condition.value,
    'price': price,
    'currency': currency,
    'images': images,
    'location': location,
    'latitude': latitude,
    'longitude': longitude,
    'shippingAvailable': shippingAvailable,
    'shippingCost': shippingCost,
    'status': status.value,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
    'expiresAt': expiresAt?.toIso8601String(),
    'views': views,
    'favorites': favorites,
    'specifications': specifications,
    'tags': tags,
  };

  factory MarketplaceListing.fromJson(Map<String, dynamic> json) {
    return MarketplaceListing(
      id: json['id'],
      sellerId: json['sellerId'],
      sellerName: json['sellerName'],
      sellerAvatar: json['sellerAvatar'],
      sellerRating: (json['sellerRating'] ?? 0).toDouble(),
      sellerReviews: json['sellerReviews'] ?? 0,
      title: json['title'],
      description: json['description'],
      category: ListingCategory.values.firstWhere(
        (c) => c.value == json['category'],
        orElse: () => ListingCategory.other,
      ),
      condition: ListingCondition.values.firstWhere(
        (c) => c.value == json['condition'],
        orElse: () => ListingCondition.good,
      ),
      price: (json['price'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'USD',
      images: List<String>.from(json['images'] ?? []),
      location: json['location'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      shippingAvailable: json['shippingAvailable'] ?? false,
      shippingCost: json['shippingCost']?.toDouble(),
      status: ListingStatus.values.firstWhere(
        (s) => s.value == json['status'],
        orElse: () => ListingStatus.active,
      ),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : null,
      expiresAt: json['expiresAt'] != null 
          ? DateTime.parse(json['expiresAt']) 
          : null,
      views: json['views'] ?? 0,
      favorites: json['favorites'] ?? 0,
      specifications: json['specifications'],
      tags: List<String>.from(json['tags'] ?? []),
    );
  }

  MarketplaceListing copyWith({
    String? title,
    String? description,
    ListingCategory? category,
    ListingCondition? condition,
    double? price,
    List<String>? images,
    String? location,
    double? latitude,
    double? longitude,
    bool? shippingAvailable,
    double? shippingCost,
    ListingStatus? status,
    Map<String, dynamic>? specifications,
    List<String>? tags,
  }) {
    return MarketplaceListing(
      id: id,
      sellerId: sellerId,
      sellerName: sellerName,
      sellerAvatar: sellerAvatar,
      sellerRating: sellerRating,
      sellerReviews: sellerReviews,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      condition: condition ?? this.condition,
      price: price ?? this.price,
      currency: currency,
      images: images ?? this.images,
      location: location ?? this.location,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      shippingAvailable: shippingAvailable ?? this.shippingAvailable,
      shippingCost: shippingCost ?? this.shippingCost,
      status: status ?? this.status,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      expiresAt: expiresAt,
      views: views,
      favorites: favorites,
      specifications: specifications ?? this.specifications,
      tags: tags ?? this.tags,
    );
  }
}

class MarketplaceMessage {
  final String id;
  final String listingId;
  final String senderId;
  final String senderName;
  final String? senderAvatar;
  final String receiverId;
  final String receiverName;
  final String? receiverAvatar;
  final String message;
  final DateTime timestamp;
  final bool isRead;
  final MessageType type;
  final Map<String, dynamic>? metadata;

  MarketplaceMessage({
    required this.id,
    required this.listingId,
    required this.senderId,
    required this.senderName,
    this.senderAvatar,
    required this.receiverId,
    required this.receiverName,
    this.receiverAvatar,
    required this.message,
    required this.timestamp,
    this.isRead = false,
    this.type = MessageType.text,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'listingId': listingId,
    'senderId': senderId,
    'senderName': senderName,
    'senderAvatar': senderAvatar,
    'receiverId': receiverId,
    'receiverName': receiverName,
    'receiverAvatar': receiverAvatar,
    'message': message,
    'timestamp': timestamp.toIso8601String(),
    'isRead': isRead,
    'type': type.value,
    'metadata': metadata,
  };

  factory MarketplaceMessage.fromJson(Map<String, dynamic> json) {
    return MarketplaceMessage(
      id: json['id'],
      listingId: json['listingId'],
      senderId: json['senderId'],
      senderName: json['senderName'],
      senderAvatar: json['senderAvatar'],
      receiverId: json['receiverId'],
      receiverName: json['receiverName'],
      receiverAvatar: json['receiverAvatar'],
      message: json['message'],
      timestamp: DateTime.parse(json['timestamp']),
      isRead: json['isRead'] ?? false,
      type: MessageType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => MessageType.text,
      ),
      metadata: json['metadata'],
    );
  }
}

enum MessageType {
  text('text'),
  offer('offer'),
  system('system');

  final String value;
  const MessageType(this.value);
}

class MarketplaceTransaction {
  final String id;
  final String listingId;
  final String buyerId;
  final String buyerName;
  final String sellerId;
  final String sellerName;
  final double amount;
  final String currency;
  final TransactionStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? trackingNumber;
  final String? notes;

  MarketplaceTransaction({
    required this.id,
    required this.listingId,
    required this.buyerId,
    required this.buyerName,
    required this.sellerId,
    required this.sellerName,
    required this.amount,
    this.currency = 'USD',
    required this.status,
    required this.createdAt,
    this.completedAt,
    this.trackingNumber,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'listingId': listingId,
    'buyerId': buyerId,
    'buyerName': buyerName,
    'sellerId': sellerId,
    'sellerName': sellerName,
    'amount': amount,
    'currency': currency,
    'status': status.value,
    'createdAt': createdAt.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'trackingNumber': trackingNumber,
    'notes': notes,
  };

  factory MarketplaceTransaction.fromJson(Map<String, dynamic> json) {
    return MarketplaceTransaction(
      id: json['id'],
      listingId: json['listingId'],
      buyerId: json['buyerId'],
      buyerName: json['buyerName'],
      sellerId: json['sellerId'],
      sellerName: json['sellerName'],
      amount: (json['amount'] ?? 0).toDouble(),
      currency: json['currency'] ?? 'USD',
      status: TransactionStatus.values.firstWhere(
        (s) => s.value == json['status'],
        orElse: () => TransactionStatus.pending,
      ),
      createdAt: DateTime.parse(json['createdAt']),
      completedAt: json['completedAt'] != null 
          ? DateTime.parse(json['completedAt']) 
          : null,
      trackingNumber: json['trackingNumber'],
      notes: json['notes'],
    );
  }
}

enum TransactionStatus {
  pending('pending', 'Pending'),
  processing('processing', 'Processing'),
  shipped('shipped', 'Shipped'),
  delivered('delivered', 'Delivered'),
  completed('completed', 'Completed'),
  cancelled('cancelled', 'Cancelled'),
  disputed('disputed', 'Disputed');

  final String value;
  final String displayName;

  const TransactionStatus(this.value, this.displayName);
}

class MarketplaceFilter {
  final ListingCategory? category;
  final ListingCondition? condition;
  final double? minPrice;
  final double? maxPrice;
  final String? location;
  final double? maxDistance;
  final bool? shippingAvailable;
  final String? searchQuery;
  final MarketplaceSortOption sortBy;

  MarketplaceFilter({
    this.category,
    this.condition,
    this.minPrice,
    this.maxPrice,
    this.location,
    this.maxDistance,
    this.shippingAvailable,
    this.searchQuery,
    this.sortBy = MarketplaceSortOption.newest,
  });

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    
    if (category != null) params['category'] = category!.value;
    if (condition != null) params['condition'] = condition!.value;
    if (minPrice != null) params['minPrice'] = minPrice;
    if (maxPrice != null) params['maxPrice'] = maxPrice;
    if (location != null) params['location'] = location;
    if (maxDistance != null) params['maxDistance'] = maxDistance;
    if (shippingAvailable != null) params['shipping'] = shippingAvailable;
    if (searchQuery != null && searchQuery!.isNotEmpty) {
      params['q'] = searchQuery;
    }
    params['sort'] = sortBy.value;
    
    return params;
  }
}

enum MarketplaceSortOption {
  newest('newest', 'Newest First'),
  priceLow('price_low', 'Price: Low to High'),
  priceHigh('price_high', 'Price: High to Low'),
  distance('distance', 'Distance: Nearest'),
  popular('popular', 'Most Popular');

  final String value;
  final String displayName;

  const MarketplaceSortOption(this.value, this.displayName);
}

class SellerProfile {
  final String id;
  final String name;
  final String? avatar;
  final String? bio;
  final double rating;
  final int totalReviews;
  final int totalSales;
  final DateTime memberSince;
  final bool verified;
  final String? location;
  final List<String> specialties;

  SellerProfile({
    required this.id,
    required this.name,
    this.avatar,
    this.bio,
    this.rating = 0.0,
    this.totalReviews = 0,
    this.totalSales = 0,
    required this.memberSince,
    this.verified = false,
    this.location,
    this.specialties = const [],
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'avatar': avatar,
    'bio': bio,
    'rating': rating,
    'totalReviews': totalReviews,
    'totalSales': totalSales,
    'memberSince': memberSince.toIso8601String(),
    'verified': verified,
    'location': location,
    'specialties': specialties,
  };

  factory SellerProfile.fromJson(Map<String, dynamic> json) {
    return SellerProfile(
      id: json['id'],
      name: json['name'],
      avatar: json['avatar'],
      bio: json['bio'],
      rating: (json['rating'] ?? 0).toDouble(),
      totalReviews: json['totalReviews'] ?? 0,
      totalSales: json['totalSales'] ?? 0,
      memberSince: DateTime.parse(json['memberSince']),
      verified: json['verified'] ?? false,
      location: json['location'],
      specialties: List<String>.from(json['specialties'] ?? []),
    );
  }
}