import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:geolocator/geolocator.dart';

import '../models/marketplace_models.dart';
import '../../auth/services/auth_service.dart';

class MarketplaceService {
  static const String _listingsKey = 'marketplace_listings';
  static const String _messagesKey = 'marketplace_messages';
  static const String _transactionsKey = 'marketplace_transactions';
  static const String _favoritesKey = 'marketplace_favorites';
  static const String _sellerProfilesKey = 'seller_profiles';

  // Get all listings with filters
  static Future<List<MarketplaceListing>> getListings({
    MarketplaceFilter? filter,
    int page = 1,
    int limit = 20,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final listingsJson = prefs.getString(_listingsKey);
    
    if (listingsJson != null) {
      final List<dynamic> listingsList = json.decode(listingsJson);
      var listings = listingsList
          .map((l) => MarketplaceListing.fromJson(l))
          .where((l) => l.isActive)
          .toList();
      
      // Apply filters
      if (filter != null) {
        listings = _applyFilters(listings, filter);
      }
      
      // Sort listings
      listings = _sortListings(listings, filter?.sortBy ?? MarketplaceSortOption.newest);
      
      // Paginate
      final startIndex = (page - 1) * limit;
      final endIndex = startIndex + limit;
      
      return listings.skip(startIndex).take(limit).toList();
    }
    
    // Return demo data
    return _generateDemoListings();
  }

  // Search listings
  static Future<List<MarketplaceListing>> searchListings(String query) async {
    final filter = MarketplaceFilter(searchQuery: query);
    return getListings(filter: filter);
  }

  // Get listing by ID
  static Future<MarketplaceListing?> getListingById(String listingId) async {
    final prefs = await SharedPreferences.getInstance();
    final listingsJson = prefs.getString(_listingsKey);
    
    if (listingsJson != null) {
      final List<dynamic> listingsList = json.decode(listingsJson);
      final listing = listingsList
          .map((l) => MarketplaceListing.fromJson(l))
          .firstWhere((l) => l.id == listingId, orElse: () => _generateDemoListings().first);
      
      // Increment view count
      await _incrementViewCount(listingId);
      
      return listing;
    }
    
    return null;
  }

  // Get user's listings
  static Future<List<MarketplaceListing>> getUserListings({
    String? userId,
    ListingStatus? status,
  }) async {
    final currentUserId = userId ?? await AuthService.getCurrentUserId();
    if (currentUserId == null) return [];
    
    final prefs = await SharedPreferences.getInstance();
    final listingsJson = prefs.getString(_listingsKey);
    
    if (listingsJson != null) {
      final List<dynamic> listingsList = json.decode(listingsJson);
      var listings = listingsList
          .map((l) => MarketplaceListing.fromJson(l))
          .where((l) => l.sellerId == currentUserId)
          .toList();
      
      if (status != null) {
        listings = listings.where((l) => l.status == status).toList();
      }
      
      return listings;
    }
    
    return [];
  }

  // Create new listing
  static Future<MarketplaceListing?> createListing({
    required String title,
    required String description,
    required ListingCategory category,
    required ListingCondition condition,
    required double price,
    required List<String> images,
    required String location,
    double? latitude,
    double? longitude,
    bool shippingAvailable = false,
    double? shippingCost,
    Map<String, dynamic>? specifications,
    List<String>? tags,
  }) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      if (currentUserId == null) return null;
      
      final user = await AuthService.getCurrentUser();
      if (user == null) return null;
      
      final listing = MarketplaceListing(
        id: const Uuid().v4(),
        sellerId: currentUserId,
        sellerName: user.name,
        sellerAvatar: user.profilePicture,
        title: title,
        description: description,
        category: category,
        condition: condition,
        price: price,
        images: images,
        location: location,
        latitude: latitude,
        longitude: longitude,
        shippingAvailable: shippingAvailable,
        shippingCost: shippingCost,
        status: ListingStatus.active,
        createdAt: DateTime.now(),
        expiresAt: DateTime.now().add(const Duration(days: 30)),
        specifications: specifications,
        tags: tags ?? [],
      );
      
      await _saveListing(listing);
      return listing;
    } catch (e) {
      print('Error creating listing: $e');
      return null;
    }
  }

  // Update listing
  static Future<bool> updateListing(MarketplaceListing listing) async {
    try {
      final listings = await _getAllListings();
      final index = listings.indexWhere((l) => l.id == listing.id);
      
      if (index != -1) {
        listings[index] = listing.copyWith();
        await _saveAllListings(listings);
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error updating listing: $e');
      return false;
    }
  }

  // Delete listing
  static Future<bool> deleteListing(String listingId) async {
    try {
      final listings = await _getAllListings();
      final index = listings.indexWhere((l) => l.id == listingId);
      
      if (index != -1) {
        listings[index] = listings[index].copyWith(status: ListingStatus.removed);
        await _saveAllListings(listings);
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error deleting listing: $e');
      return false;
    }
  }

  // Toggle favorite
  static Future<bool> toggleFavorite(String listingId) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      if (currentUserId == null) return false;
      
      final prefs = await SharedPreferences.getInstance();
      final favoritesJson = prefs.getString('$_favoritesKey-$currentUserId');
      final favorites = favoritesJson != null 
          ? Set<String>.from(json.decode(favoritesJson))
          : <String>{};
      
      if (favorites.contains(listingId)) {
        favorites.remove(listingId);
      } else {
        favorites.add(listingId);
      }
      
      await prefs.setString(
        '$_favoritesKey-$currentUserId',
        json.encode(favorites.toList()),
      );
      
      return true;
    } catch (e) {
      print('Error toggling favorite: $e');
      return false;
    }
  }

  // Get user's favorites
  static Future<List<MarketplaceListing>> getFavorites() async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      if (currentUserId == null) return [];
      
      final prefs = await SharedPreferences.getInstance();
      final favoritesJson = prefs.getString('$_favoritesKey-$currentUserId');
      
      if (favoritesJson != null) {
        final favorites = Set<String>.from(json.decode(favoritesJson));
        final allListings = await _getAllListings();
        
        return allListings
            .where((l) => favorites.contains(l.id) && l.isActive)
            .toList();
      }
      
      return [];
    } catch (e) {
      print('Error getting favorites: $e');
      return [];
    }
  }

  // Check if listing is favorited
  static Future<bool> isFavorited(String listingId) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      if (currentUserId == null) return false;
      
      final prefs = await SharedPreferences.getInstance();
      final favoritesJson = prefs.getString('$_favoritesKey-$currentUserId');
      
      if (favoritesJson != null) {
        final favorites = Set<String>.from(json.decode(favoritesJson));
        return favorites.contains(listingId);
      }
      
      return false;
    } catch (e) {
      print('Error checking favorite: $e');
      return false;
    }
  }

  // Send message
  static Future<bool> sendMessage({
    required String listingId,
    required String receiverId,
    required String message,
    MessageType type = MessageType.text,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      if (currentUserId == null) return false;
      
      final user = await AuthService.getCurrentUser();
      if (user == null) return false;
      
      final newMessage = MarketplaceMessage(
        id: const Uuid().v4(),
        listingId: listingId,
        senderId: currentUserId,
        senderName: user.name,
        senderAvatar: user.profilePicture,
        receiverId: receiverId,
        receiverName: 'Receiver', // TODO: Get actual receiver name
        message: message,
        timestamp: DateTime.now(),
        type: type,
        metadata: metadata,
      );
      
      await _saveMessage(newMessage);
      return true;
    } catch (e) {
      print('Error sending message: $e');
      return false;
    }
  }

  // Get messages for listing
  static Future<List<MarketplaceMessage>> getListingMessages(String listingId) async {
    final currentUserId = await AuthService.getCurrentUserId();
    if (currentUserId == null) return [];
    
    final prefs = await SharedPreferences.getInstance();
    final messagesJson = prefs.getString(_messagesKey);
    
    if (messagesJson != null) {
      final List<dynamic> messagesList = json.decode(messagesJson);
      final messages = messagesList
          .map((m) => MarketplaceMessage.fromJson(m))
          .where((m) => 
              m.listingId == listingId &&
              (m.senderId == currentUserId || m.receiverId == currentUserId))
          .toList();
      
      // Sort by timestamp
      messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      
      return messages;
    }
    
    return [];
  }

  // Get user's conversations
  static Future<List<Map<String, dynamic>>> getUserConversations() async {
    final currentUserId = await AuthService.getCurrentUserId();
    if (currentUserId == null) return [];
    
    final prefs = await SharedPreferences.getInstance();
    final messagesJson = prefs.getString(_messagesKey);
    
    if (messagesJson != null) {
      final List<dynamic> messagesList = json.decode(messagesJson);
      final messages = messagesList
          .map((m) => MarketplaceMessage.fromJson(m))
          .where((m) => m.senderId == currentUserId || m.receiverId == currentUserId)
          .toList();
      
      // Group by listing and other user
      final conversations = <String, Map<String, dynamic>>{};
      
      for (final message in messages) {
        final otherUserId = message.senderId == currentUserId 
            ? message.receiverId 
            : message.senderId;
        final key = '${message.listingId}-$otherUserId';
        
        if (!conversations.containsKey(key)) {
          final listing = await getListingById(message.listingId);
          conversations[key] = {
            'listingId': message.listingId,
            'listing': listing,
            'otherUserId': otherUserId,
            'otherUserName': message.senderId == currentUserId 
                ? message.receiverName 
                : message.senderName,
            'otherUserAvatar': message.senderId == currentUserId 
                ? message.receiverAvatar 
                : message.senderAvatar,
            'lastMessage': message,
            'unreadCount': 0,
          };
        } else {
          conversations[key]!['lastMessage'] = message;
          if (!message.isRead && message.senderId != currentUserId) {
            conversations[key]!['unreadCount']++;
          }
        }
      }
      
      // Sort by last message timestamp
      final sortedConversations = conversations.values.toList()
        ..sort((a, b) => (b['lastMessage'] as MarketplaceMessage).timestamp
            .compareTo((a['lastMessage'] as MarketplaceMessage).timestamp));
      
      return sortedConversations;
    }
    
    return [];
  }

  // Get current location
  static Future<Position?> getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final requestedPermission = await Geolocator.requestPermission();
        if (requestedPermission == LocationPermission.denied ||
            requestedPermission == LocationPermission.deniedForever) {
          return null;
        }
      }
      
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  // Calculate distance between two points
  static double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2) / 1000; // Convert to km
  }

  // Upload images
  static Future<List<String>> uploadImages(List<XFile> images) async {
    final uploadedUrls = <String>[];
    
    try {
      final tempDir = await getTemporaryDirectory();
      
      for (final image in images) {
        // In a real app, this would upload to cloud storage
        // For now, we'll just save locally
        final fileName = '${const Uuid().v4()}.jpg';
        final file = File('${tempDir.path}/$fileName');
        await file.writeAsBytes(await image.readAsBytes());
        uploadedUrls.add(file.path);
      }
      
      return uploadedUrls;
    } catch (e) {
      print('Error uploading images: $e');
      return [];
    }
  }

  // Get seller profile
  static Future<SellerProfile?> getSellerProfile(String sellerId) async {
    final prefs = await SharedPreferences.getInstance();
    final profilesJson = prefs.getString(_sellerProfilesKey);
    
    if (profilesJson != null) {
      final Map<String, dynamic> profiles = json.decode(profilesJson);
      if (profiles.containsKey(sellerId)) {
        return SellerProfile.fromJson(profiles[sellerId]);
      }
    }
    
    // Return demo profile
    final user = await AuthService.getCurrentUser();
    return SellerProfile(
      id: sellerId,
      name: user?.name ?? 'Demo Seller',
      avatar: user?.profilePicture,
      bio: 'Passionate aquarium enthusiast with over 10 years of experience.',
      rating: 4.8,
      totalReviews: 124,
      totalSales: 89,
      memberSince: DateTime.now().subtract(const Duration(days: 365)),
      verified: true,
      location: 'San Francisco, CA',
      specialties: ['Reef Equipment', 'Rare Fish', 'Aquarium Setup'],
    );
  }

  // Private helper methods
  static List<MarketplaceListing> _applyFilters(
    List<MarketplaceListing> listings,
    MarketplaceFilter filter,
  ) {
    var filtered = listings;
    
    if (filter.category != null) {
      filtered = filtered.where((l) => l.category == filter.category).toList();
    }
    
    if (filter.condition != null) {
      filtered = filtered.where((l) => l.condition == filter.condition).toList();
    }
    
    if (filter.minPrice != null) {
      filtered = filtered.where((l) => l.price >= filter.minPrice!).toList();
    }
    
    if (filter.maxPrice != null) {
      filtered = filtered.where((l) => l.price <= filter.maxPrice!).toList();
    }
    
    if (filter.shippingAvailable != null) {
      filtered = filtered.where((l) => l.shippingAvailable == filter.shippingAvailable).toList();
    }
    
    if (filter.searchQuery != null && filter.searchQuery!.isNotEmpty) {
      final query = filter.searchQuery!.toLowerCase();
      filtered = filtered.where((l) =>
          l.title.toLowerCase().contains(query) ||
          l.description.toLowerCase().contains(query) ||
          l.tags.any((tag) => tag.toLowerCase().contains(query))
      ).toList();
    }
    
    return filtered;
  }

  static List<MarketplaceListing> _sortListings(
    List<MarketplaceListing> listings,
    MarketplaceSortOption sortBy,
  ) {
    switch (sortBy) {
      case MarketplaceSortOption.newest:
        listings.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
      case MarketplaceSortOption.priceLow:
        listings.sort((a, b) => a.price.compareTo(b.price));
        break;
      case MarketplaceSortOption.priceHigh:
        listings.sort((a, b) => b.price.compareTo(a.price));
        break;
      case MarketplaceSortOption.popular:
        listings.sort((a, b) => b.views.compareTo(a.views));
        break;
      case MarketplaceSortOption.distance:
        // TODO: Implement distance sorting
        break;
    }
    
    return listings;
  }

  static Future<List<MarketplaceListing>> _getAllListings() async {
    final prefs = await SharedPreferences.getInstance();
    final listingsJson = prefs.getString(_listingsKey);
    
    if (listingsJson != null) {
      final List<dynamic> listingsList = json.decode(listingsJson);
      return listingsList.map((l) => MarketplaceListing.fromJson(l)).toList();
    }
    
    return [];
  }

  static Future<void> _saveAllListings(List<MarketplaceListing> listings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _listingsKey,
      json.encode(listings.map((l) => l.toJson()).toList()),
    );
  }

  static Future<void> _saveListing(MarketplaceListing listing) async {
    final listings = await _getAllListings();
    listings.add(listing);
    await _saveAllListings(listings);
  }

  static Future<void> _saveMessage(MarketplaceMessage message) async {
    final prefs = await SharedPreferences.getInstance();
    final messagesJson = prefs.getString(_messagesKey);
    final messages = messagesJson != null 
        ? List<Map<String, dynamic>>.from(json.decode(messagesJson))
        : <Map<String, dynamic>>[];
    
    messages.add(message.toJson());
    
    await prefs.setString(_messagesKey, json.encode(messages));
  }

  static Future<void> _incrementViewCount(String listingId) async {
    final listings = await _getAllListings();
    final index = listings.indexWhere((l) => l.id == listingId);
    
    if (index != -1) {
      final listing = listings[index];
      listings[index] = MarketplaceListing(
        id: listing.id,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        sellerAvatar: listing.sellerAvatar,
        sellerRating: listing.sellerRating,
        sellerReviews: listing.sellerReviews,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition,
        price: listing.price,
        currency: listing.currency,
        images: listing.images,
        location: listing.location,
        latitude: listing.latitude,
        longitude: listing.longitude,
        shippingAvailable: listing.shippingAvailable,
        shippingCost: listing.shippingCost,
        status: listing.status,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        expiresAt: listing.expiresAt,
        views: listing.views + 1,
        favorites: listing.favorites,
        specifications: listing.specifications,
        tags: listing.tags,
      );
      await _saveAllListings(listings);
    }
  }

  static List<MarketplaceListing> _generateDemoListings() {
    return [
      MarketplaceListing(
        id: '1',
        sellerId: 'user1',
        sellerName: 'John\'s Aquarium Store',
        sellerRating: 4.8,
        sellerReviews: 124,
        title: 'Red Sea Reefer 250 Complete System',
        description: 'Excellent condition Red Sea Reefer 250 complete reef system. Includes tank, stand, sump, and all plumbing. Upgraded return pump and added wave makers.',
        category: ListingCategory.equipment,
        condition: ListingCondition.likeNew,
        price: 1299.99,
        images: ['https://example.com/reefer1.jpg', 'https://example.com/reefer2.jpg'],
        location: 'San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        shippingAvailable: false,
        status: ListingStatus.active,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        expiresAt: DateTime.now().add(const Duration(days: 28)),
        views: 234,
        favorites: 18,
        tags: ['reef', 'red sea', 'complete system'],
      ),
      MarketplaceListing(
        id: '2',
        sellerId: 'user2',
        sellerName: 'Exotic Fish Paradise',
        sellerRating: 4.9,
        sellerReviews: 89,
        title: 'Pair of Clownfish - Ocellaris',
        description: 'Beautiful bonded pair of Ocellaris clownfish. Healthy, eating well, and ready for their new home. Both are approximately 2 inches.',
        category: ListingCategory.fish,
        condition: ListingCondition.new_,
        price: 79.99,
        images: ['https://example.com/clown1.jpg'],
        location: 'Los Angeles, CA',
        latitude: 34.0522,
        longitude: -118.2437,
        shippingAvailable: true,
        shippingCost: 29.99,
        status: ListingStatus.active,
        createdAt: DateTime.now().subtract(const Duration(hours: 12)),
        expiresAt: DateTime.now().add(const Duration(days: 30)),
        views: 156,
        favorites: 24,
        tags: ['clownfish', 'saltwater', 'pair'],
      ),
    ];
  }
}