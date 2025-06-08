import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/shared_aquarium.dart';
import '../models/comment.dart';
import '../services/social_service.dart';
import '../widgets/shared_aquarium_card.dart';
import '../widgets/comment_card.dart';

class SharedAquariumDetailScreen extends StatefulWidget {
  final String sharedAquariumId;

  const SharedAquariumDetailScreen({
    super.key,
    required this.sharedAquariumId,
  });

  @override
  State<SharedAquariumDetailScreen> createState() =>
      _SharedAquariumDetailScreenState();
}

class _SharedAquariumDetailScreenState
    extends State<SharedAquariumDetailScreen> {
  final _commentController = TextEditingController();
  final _scrollController = ScrollController();

  SharedAquarium? _sharedAquarium;
  List<Comment> _comments = [];
  bool _isLoading = true;
  bool _isLiked = false;
  String? _replyToCommentId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      // Increment view count
      await SocialService.incrementViewCount(widget.sharedAquariumId);

      // Load aquarium data
      final aquariums = await SocialService.getSharedAquariums();
      final aquarium = aquariums.firstWhere(
        (a) => a.id == widget.sharedAquariumId,
      );

      // Load comments
      final comments = await SocialService.getComments(widget.sharedAquariumId);

      setState(() {
        _sharedAquarium = aquarium;
        _comments = comments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load aquarium: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        context.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _sharedAquarium == null) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            // App Bar with Image
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(_sharedAquarium!.aquariumName),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_sharedAquarium!.imageUrl != null)
                      CachedNetworkImage(
                        imageUrl: _sharedAquarium!.imageUrl!,
                        fit: BoxFit.cover,
                      )
                    else
                      Container(
                        color: AppTheme.primaryColor,
                        child: const Icon(
                          Icons.water,
                          size: 80,
                          color: Colors.white,
                        ),
                      ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) {
                    switch (value) {
                      case 'share':
                        // TODO: Implement external share
                        break;
                      case 'report':
                        // TODO: Implement report
                        break;
                    }
                  },
                  itemBuilder: (context) => [
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
                    const PopupMenuItem(
                      value: 'report',
                      child: Row(
                        children: [
                          Icon(Icons.flag, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Report', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // Content
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Aquarium Info Card
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SharedAquariumCard(
                      sharedAquarium: _sharedAquarium!,
                      onTap: () {}, // Already on detail page
                      isDetailed: true,
                      onLike: _toggleLike,
                    ),
                  ),

                  // Action Buttons
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: CustomButton(
                            text: _isLiked ? 'Liked' : 'Like',
                            icon: _isLiked 
                                ? Icons.favorite 
                                : Icons.favorite_border,
                            variant: _isLiked 
                                ? ButtonVariant.primary 
                                : ButtonVariant.outline,
                            onPressed: _sharedAquarium!.allowLikes 
                                ? _toggleLike 
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: CustomButton(
                            text: 'Follow',
                            icon: Icons.person_add,
                            variant: ButtonVariant.outline,
                            onPressed: _followUser,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Comments Section
                  if (_sharedAquarium!.allowComments) ...[
                    const Divider(),
                    _buildCommentsSection(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _sharedAquarium!.allowComments
          ? _buildCommentInput()
          : null,
    );
  }

  Widget _buildCommentsSection() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.comment,
                color: AppTheme.primaryColor,
              ),
              const SizedBox(width: 8),
              Text(
                'Comments (${_comments.length})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_comments.isEmpty)
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.chat_bubble_outline,
                    size: 48,
                    color: AppTheme.greyColor,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No comments yet',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Be the first to comment!',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _comments.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final comment = _comments[index];
                return CommentCard(
                  comment: comment,
                  onReply: () {
                    setState(() {
                      _replyToCommentId = comment.id;
                    });
                    _commentController.requestFocus();
                  },
                  onLike: () => _toggleCommentLike(comment),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildCommentInput() {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 8,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_replyToCommentId != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.reply,
                    size: 16,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Replying to comment...',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () {
                      setState(() {
                        _replyToCommentId = null;
                      });
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              Expanded(
                child: CustomTextField(
                  controller: _commentController,
                  hintText: 'Add a comment...',
                  maxLines: null,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send),
                color: AppTheme.primaryColor,
                onPressed: _addComment,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _toggleLike() async {
    setState(() => _isLiked = !_isLiked);
    
    await SocialService.toggleLike(
      sharedAquariumId: widget.sharedAquariumId,
      userId: 'current_user', // TODO: Get actual user ID
    );
    
    _loadData();
  }

  Future<void> _followUser() async {
    await SocialService.toggleFollow(
      userId: 'current_user', // TODO: Get actual user ID
      targetUserId: _sharedAquarium!.ownerId,
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Following ${_sharedAquarium!.ownerName}'),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  Future<void> _addComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;
    
    _commentController.clear();
    
    await SocialService.addComment(
      sharedAquariumId: widget.sharedAquariumId,
      userId: 'current_user', // TODO: Get actual user ID
      userName: 'Current User', // TODO: Get actual user name
      content: content,
      parentId: _replyToCommentId,
    );
    
    setState(() {
      _replyToCommentId = null;
    });
    
    _loadData();
  }

  Future<void> _toggleCommentLike(Comment comment) async {
    // TODO: Implement comment like functionality
  }
}