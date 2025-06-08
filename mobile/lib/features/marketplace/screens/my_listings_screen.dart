import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/marketplace_models.dart';
import '../services/marketplace_service.dart';

class MyListingsScreen extends StatefulWidget {
  const MyListingsScreen({super.key});

  @override
  State<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends State<MyListingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  Map<ListingStatus, List<MarketplaceListing>> _listingsByStatus = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadListings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadListings() async {
    setState(() => _isLoading = true);

    try {
      final allListings = await MarketplaceService.getUserListings();
      
      final groupedListings = <ListingStatus, List<MarketplaceListing>>{};
      for (final status in [
        ListingStatus.active,
        ListingStatus.sold,
        ListingStatus.expired,
        ListingStatus.draft,
      ]) {
        groupedListings[status] = allListings
            .where((l) => l.status == status)
            .toList();
      }

      setState(() {
        _listingsByStatus = groupedListings;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteListing(MarketplaceListing listing) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Listing?'),
        content: const Text(
          'Are you sure you want to delete this listing? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await MarketplaceService.deleteListing(listing.id);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Listing deleted successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        _loadListings();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Listings'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: [
            Tab(text: 'Active (${_listingsByStatus[ListingStatus.active]?.length ?? 0})'),
            Tab(text: 'Sold (${_listingsByStatus[ListingStatus.sold]?.length ?? 0})'),
            Tab(text: 'Expired (${_listingsByStatus[ListingStatus.expired]?.length ?? 0})'),
            Tab(text: 'Drafts (${_listingsByStatus[ListingStatus.draft]?.length ?? 0})'),
          ],
        ),
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : TabBarView(
              controller: _tabController,
              children: [
                _buildListingTab(ListingStatus.active),
                _buildListingTab(ListingStatus.sold),
                _buildListingTab(ListingStatus.expired),
                _buildListingTab(ListingStatus.draft),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/marketplace/create-listing');
        },
        backgroundColor: AppTheme.accentColor,
        icon: const Icon(Icons.add),
        label: const Text('Create Listing'),
      ),
    );
  }

  Widget _buildListingTab(ListingStatus status) {
    final listings = _listingsByStatus[status] ?? [];

    if (listings.isEmpty) {
      String message;
      String actionLabel = 'Create Listing';
      
      switch (status) {
        case ListingStatus.active:
          message = 'You don\'t have any active listings';
          break;
        case ListingStatus.sold:
          message = 'You haven\'t sold any items yet';
          actionLabel = '';
          break;
        case ListingStatus.expired:
          message = 'No expired listings';
          actionLabel = '';
          break;
        case ListingStatus.draft:
          message = 'No draft listings';
          break;
        default:
          message = 'No listings found';
      }

      return EmptyState(
        icon: Icons.store,
        title: 'No Listings',
        message: message,
        actionLabel: actionLabel.isNotEmpty ? actionLabel : null,
        onAction: actionLabel.isNotEmpty
            ? () => context.push('/marketplace/create-listing')
            : null,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadListings,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: listings.length,
        itemBuilder: (context, index) {
          final listing = listings[index];
          return _buildListingCard(listing);
        },
      ),
    );
  }

  Widget _buildListingCard(MarketplaceListing listing) {
    final currencyFormat = NumberFormat.currency(symbol: '\$');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          if (listing.status == ListingStatus.draft) {
            context.push('/marketplace/create-listing', extra: listing);
          } else {
            context.push('/marketplace/listing/${listing.id}');
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey[200],
                ),
                child: listing.images.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          listing.mainImage,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(
                              listing.category.icon,
                              size: 32,
                              color: Colors.grey[400],
                            );
                          },
                        ),
                      )
                    : Icon(
                        listing.category.icon,
                        size: 32,
                        color: Colors.grey[400],
                      ),
              ),
              const SizedBox(width: 16),
              
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currencyFormat.format(listing.price),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.visibility, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          '${listing.views}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 12),
                        Icon(Icons.favorite, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          '${listing.favorites}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          _getTimeAgo(listing.createdAt),
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Actions
              PopupMenuButton<String>(
                onSelected: (value) {
                  switch (value) {
                    case 'edit':
                      context.push('/marketplace/create-listing', extra: listing);
                      break;
                    case 'view':
                      context.push('/marketplace/listing/${listing.id}');
                      break;
                    case 'delete':
                      _deleteListing(listing);
                      break;
                    case 'share':
                      // TODO: Implement share
                      break;
                  }
                },
                itemBuilder: (context) => [
                  if (listing.status == ListingStatus.active ||
                      listing.status == ListingStatus.draft)
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Edit'),
                        ],
                      ),
                    ),
                  if (listing.status != ListingStatus.draft)
                    const PopupMenuItem(
                      value: 'view',
                      child: Row(
                        children: [
                          Icon(Icons.visibility, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('View'),
                        ],
                      ),
                    ),
                  const PopupMenuItem(
                    value: 'share',
                    child: Row(
                      children: [
                        Icon(Icons.share, color: Colors.black54),
                        SizedBox(width: 8),
                        Text('Share'),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return '$months month${months > 1 ? 's' : ''} ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
    } else {
      return 'Just now';
    }
  }
}