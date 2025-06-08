import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/marketplace_models.dart';
import '../services/marketplace_service.dart';
import '../widgets/marketplace_filter_dialog.dart';
import '../widgets/listing_card.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();
  
  List<MarketplaceListing> _listings = [];
  List<MarketplaceListing> _favorites = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  
  MarketplaceFilter _filter = MarketplaceFilter();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadListings();
    _loadFavorites();
    
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        _loadMoreListings();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadListings({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _listings.clear();
      });
    }

    setState(() => _isLoading = true);

    try {
      final listings = await MarketplaceService.getListings(
        filter: _filter,
        page: _currentPage,
      );

      setState(() {
        if (refresh) {
          _listings = listings;
        } else {
          _listings.addAll(listings);
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadMoreListings() async {
    if (_isLoadingMore) return;

    setState(() => _isLoadingMore = true);

    try {
      _currentPage++;
      final listings = await MarketplaceService.getListings(
        filter: _filter,
        page: _currentPage,
      );

      setState(() {
        _listings.addAll(listings);
        _isLoadingMore = false;
      });
    } catch (e) {
      setState(() => _isLoadingMore = false);
    }
  }

  Future<void> _loadFavorites() async {
    try {
      final favorites = await MarketplaceService.getFavorites();
      setState(() => _favorites = favorites);
    } catch (e) {
      // Handle error
    }
  }

  void _applyFilter(MarketplaceFilter filter) {
    setState(() => _filter = filter);
    _loadListings(refresh: true);
  }

  void _searchListings(String query) {
    setState(() {
      _filter = MarketplaceFilter(
        category: _filter.category,
        condition: _filter.condition,
        minPrice: _filter.minPrice,
        maxPrice: _filter.maxPrice,
        location: _filter.location,
        maxDistance: _filter.maxDistance,
        shippingAvailable: _filter.shippingAvailable,
        searchQuery: query,
        sortBy: _filter.sortBy,
      );
    });
    _loadListings(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        title: const Text('Marketplace'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Browse'),
            Tab(text: 'Favorites'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.message),
            onPressed: () {
              context.push('/marketplace/messages');
            },
          ),
          IconButton(
            icon: const Icon(Icons.sell),
            onPressed: () {
              context.push('/marketplace/my-listings');
            },
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildBrowseTab(),
          _buildFavoritesTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/marketplace/create-listing');
        },
        backgroundColor: AppTheme.accentColor,
        icon: const Icon(Icons.add),
        label: const Text('Sell Item'),
      ),
    );
  }

  Widget _buildBrowseTab() {
    return Column(
      children: [
        // Search and Filter Bar
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.grey[100],
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search marketplace...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  onSubmitted: _searchListings,
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => MarketplaceFilterDialog(
                      currentFilter: _filter,
                      onApply: _applyFilter,
                    ),
                  );
                },
                icon: const Icon(Icons.filter_list),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
        
        // Category Chips
        Container(
          height: 50,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              _buildCategoryChip(null, 'All'),
              ...ListingCategory.values.map((category) =>
                  _buildCategoryChip(category, category.displayName)),
            ],
          ),
        ),
        
        // Listings Grid
        Expanded(
          child: _isLoading
              ? const LoadingIndicator()
              : _listings.isEmpty
                  ? EmptyState(
                      icon: Icons.store,
                      title: 'No Listings Found',
                      message: 'Try adjusting your filters or search terms',
                      actionLabel: 'Clear Filters',
                      onAction: () {
                        setState(() {
                          _filter = MarketplaceFilter();
                          _searchController.clear();
                        });
                        _loadListings(refresh: true);
                      },
                    )
                  : RefreshIndicator(
                      onRefresh: () => _loadListings(refresh: true),
                      child: GridView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.7,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        itemCount: _listings.length + (_isLoadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == _listings.length) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          
                          final listing = _listings[index];
                          return ListingCard(
                            listing: listing,
                            onTap: () {
                              context.push('/marketplace/listing/${listing.id}');
                            },
                            onFavoriteToggle: () async {
                              await MarketplaceService.toggleFavorite(listing.id);
                              _loadFavorites();
                            },
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildFavoritesTab() {
    if (_favorites.isEmpty) {
      return EmptyState(
        icon: Icons.favorite_border,
        title: 'No Favorites Yet',
        message: 'Items you favorite will appear here',
        actionLabel: 'Browse Marketplace',
        onAction: () {
          _tabController.animateTo(0);
        },
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await _loadFavorites();
      },
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.7,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: _favorites.length,
        itemBuilder: (context, index) {
          final listing = _favorites[index];
          return ListingCard(
            listing: listing,
            isFavorited: true,
            onTap: () {
              context.push('/marketplace/listing/${listing.id}');
            },
            onFavoriteToggle: () async {
              await MarketplaceService.toggleFavorite(listing.id);
              _loadFavorites();
            },
          );
        },
      ),
    );
  }

  Widget _buildCategoryChip(ListingCategory? category, String label) {
    final isSelected = _filter.category == category;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (category != null) ...[
              Icon(
                category.icon,
                size: 16,
                color: isSelected ? Colors.white : AppTheme.primaryColor,
              ),
              const SizedBox(width: 4),
            ],
            Text(label),
          ],
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _filter = MarketplaceFilter(
              category: selected ? category : null,
              condition: _filter.condition,
              minPrice: _filter.minPrice,
              maxPrice: _filter.maxPrice,
              location: _filter.location,
              maxDistance: _filter.maxDistance,
              shippingAvailable: _filter.shippingAvailable,
              searchQuery: _filter.searchQuery,
              sortBy: _filter.sortBy,
            );
          });
          _loadListings(refresh: true);
        },
        selectedColor: AppTheme.primaryColor,
        checkmarkColor: Colors.white,
      ),
    );
  }
}