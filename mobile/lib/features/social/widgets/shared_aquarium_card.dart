import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/shared_aquarium.dart';

class SharedAquariumCard extends StatelessWidget {
  final SharedAquarium sharedAquarium;
  final VoidCallback onTap;
  final VoidCallback? onLike;
  final VoidCallback? onShare;
  final bool isDetailed;

  const SharedAquariumCard({
    super.key,
    required this.sharedAquarium,
    required this.onTap,
    this.onLike,
    this.onShare,
    this.isDetailed = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            if (sharedAquarium.imageUrl != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: CachedNetworkImage(
                    imageUrl: sharedAquarium.imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      child: Icon(
                        Icons.water,
                        size: 48,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ),
              )
            else
              Container(
                height: 180,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.water,
                    size: 64,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
            
            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      // User Avatar
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppTheme.primaryColor,
                        backgroundImage: sharedAquarium.ownerAvatar != null
                            ? CachedNetworkImageProvider(
                                sharedAquarium.ownerAvatar!)
                            : null,
                        child: sharedAquarium.ownerAvatar == null
                            ? Text(
                                sharedAquarium.ownerName[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      
                      // User Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sharedAquarium.ownerName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              _formatDate(sharedAquarium.sharedAt),
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Visibility Badge
                      if (sharedAquarium.visibility != ShareVisibility.public)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.greyColor.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                sharedAquarium.visibility == ShareVisibility.friends
                                    ? Icons.people
                                    : Icons.lock,
                                size: 12,
                                color: AppTheme.greyColor,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                sharedAquarium.visibility.displayName,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.greyColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Aquarium Name
                  Text(
                    sharedAquarium.aquariumName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  
                  // Description
                  if (sharedAquarium.description != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      sharedAquarium.description!,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                        height: 1.4,
                      ),
                      maxLines: isDetailed ? null : 2,
                      overflow: isDetailed 
                          ? TextOverflow.visible 
                          : TextOverflow.ellipsis,
                    ),
                  ],
                  
                  // Tags
                  if (sharedAquarium.tags.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: sharedAquarium.tags.map((tag) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '#$tag',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  
                  const SizedBox(height: 16),
                  
                  // Stats and Actions
                  Row(
                    children: [
                      // Views
                      _buildStat(
                        Icons.visibility,
                        sharedAquarium.stats.views.toString(),
                      ),
                      const SizedBox(width: 16),
                      
                      // Likes
                      if (sharedAquarium.allowLikes) ...[
                        InkWell(
                          onTap: onLike,
                          borderRadius: BorderRadius.circular(20),
                          child: _buildStat(
                            Icons.favorite_border,
                            sharedAquarium.stats.likes.toString(),
                            color: AppTheme.errorColor,
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      
                      // Comments
                      if (sharedAquarium.allowComments) ...[
                        _buildStat(
                          Icons.comment_outlined,
                          sharedAquarium.stats.comments.toString(),
                        ),
                        const SizedBox(width: 16),
                      ],
                      
                      // Share
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.share_outlined),
                        onPressed: onShare,
                        iconSize: 20,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(IconData icon, String value, {Color? color}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 18,
          color: color ?? AppTheme.textSecondary,
        ),
        const SizedBox(width: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            color: AppTheme.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays > 7) {
      return DateFormat('MMM d').format(date);
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}