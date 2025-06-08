import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/shared_aquarium.dart';
import '../services/social_service.dart';
import '../widgets/shared_aquarium_card.dart';
import '../widgets/trending_tags_widget.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  
  List<SharedAquarium> _trendingAquariums = [];
  List<SharedAquarium> _recentAquariums = [];
  List<SharedAquarium> _followingAquariums = [];
  List<String> _popularTags = [];
  bool _isLoading = true;
  String? _selectedTag;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final allShared = await SocialService.getSharedAquariums();
      final trending = await SocialService.getTrendingAquariums();
      final tags = await SocialService.getPopularTags();
      
      // Sort by date for recent
      final recent = List<SharedAquarium>.from(allShared)
        ..sort((a, b) => b.sharedAt.compareTo(a.sharedAt));
      
      // TODO: Filter by following users when user system is implemented
      final following = <SharedAquarium>[];
      
      setState(() {
        _trendingAquariums = trending;
        _recentAquariums = recent;
        _followingAquariums = following;
        _popularTags = tags;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load community data: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty && _selectedTag == null) {
      _loadData();
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      final results = await SocialService.searchSharedAquariums(
        query: query.isNotEmpty ? query : null,
        tags: _selectedTag != null ? [_selectedTag!] : null,
      );
      
      setState(() {
        _trendingAquariums = results;
        _recentAquariums = results;
        _followingAquariums = [];
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
        title: const Text('Community'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Trending'),
            Tab(text: 'Recent'),
            Tab(text: 'Following'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                CustomTextField(
                  controller: _searchController,
                  hintText: 'Search aquariums, users, or tags...',
                  prefixIcon: Icons.search,
                  suffixIcon: _searchController.text.isNotEmpty ? Icons.clear : null,
                  onSuffixIconPressed: () {
                    _searchController.clear();
                    _selectedTag = null;
                    _loadData();
                  },
                  onSubmitted: (_) => _search(),
                ),
                if (_popularTags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  TrendingTagsWidget(
                    tags: _popularTags,
                    selectedTag: _selectedTag,
                    onTagSelected: (tag) {
                      setState(() {
                        _selectedTag = _selectedTag == tag ? null : tag;
                      });
                      _search();
                    },
                  ),
                ],
              ],
            ),
          ),
          
          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildAquariumList(_trendingAquariums),
                      _buildAquariumList(_recentAquariums),
                      _buildAquariumList(_followingAquariums),
                    ],
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/share-aquarium');
        },
        backgroundColor: AppTheme.secondaryColor,
        icon: const Icon(Icons.share),
        label: const Text('Share Aquarium'),
      ),
    );
  }

  Widget _buildAquariumList(List<SharedAquarium> aquariums) {
    if (aquariums.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.water,
              size: 64,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 16),
            Text(
              _tabController.index == 2
                  ? 'Follow other users to see their aquariums'
                  : 'No aquariums found',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.textSecondary,
              ),
            ),
            if (_tabController.index != 2) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: () {
                  context.push('/share-aquarium');
                },
                child: const Text('Be the first to share!'),
              ),
            ],
          ],
        ),
      );
    }
    
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: aquariums.length,
        itemBuilder: (context, index) {
          final aquarium = aquariums[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SharedAquariumCard(
              sharedAquarium: aquarium,
              onTap: () {
                context.push('/shared-aquarium/${aquarium.id}');
              },
              onLike: () async {
                await SocialService.toggleLike(
                  sharedAquariumId: aquarium.id,
                  userId: 'current_user', // TODO: Get actual user ID
                );
                _loadData();
              },
              onShare: () {
                // TODO: Implement share functionality
              },
            ),
          );
        },
      ),
    );
  }
}