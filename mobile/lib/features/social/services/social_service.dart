import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/shared_aquarium.dart';
import '../models/comment.dart';
import '../models/social_user.dart';
import '../../aquarium/models/aquarium_model.dart';

class SocialService {
  static const String _sharedAquariumsKey = 'verpa_shared_aquariums';
  static const String _commentsKey = 'verpa_comments';
  static const String _socialUsersKey = 'verpa_social_users';
  static const String _followingKey = 'verpa_following';
  static const String _likesKey = 'verpa_likes';

  static final _uuid = const Uuid();

  // Share Aquarium
  static Future<SharedAquarium> shareAquarium({
    required Aquarium aquarium,
    required String userId,
    required String userName,
    String? userAvatar,
    String? description,
    ShareVisibility visibility = ShareVisibility.public,
    List<String> tags = const [],
    bool allowComments = true,
    bool allowLikes = true,
    Duration? expiresIn,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    final sharedAquarium = SharedAquarium(
      id: _uuid.v4(),
      aquariumId: aquarium.id,
      aquariumName: aquarium.name,
      ownerId: userId,
      ownerName: userName,
      ownerAvatar: userAvatar,
      description: description ?? aquarium.description,
      imageUrl: aquarium.imageUrl,
      visibility: visibility,
      tags: tags,
      stats: SharedAquariumStats.empty(),
      allowComments: allowComments,
      allowLikes: allowLikes,
      sharedAt: DateTime.now(),
      expiresAt: expiresIn != null 
          ? DateTime.now().add(expiresIn)
          : null,
    );

    // Save to storage
    final sharedAquariums = await getSharedAquariums();
    sharedAquariums.add(sharedAquarium);
    
    await prefs.setString(
      _sharedAquariumsKey,
      jsonEncode(sharedAquariums.map((a) => a.toJson()).toList()),
    );

    return sharedAquarium;
  }

  // Get all shared aquariums
  static Future<List<SharedAquarium>> getSharedAquariums() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_sharedAquariumsKey);
    
    if (data == null) return [];
    
    final List<dynamic> jsonList = jsonDecode(data);
    final now = DateTime.now();
    
    // Filter out expired aquariums
    return jsonList
        .map((json) => SharedAquarium.fromJson(json))
        .where((aquarium) => 
            aquarium.expiresAt == null || aquarium.expiresAt!.isAfter(now))
        .toList();
  }

  // Get shared aquariums by user
  static Future<List<SharedAquarium>> getUserSharedAquariums(String userId) async {
    final allShared = await getSharedAquariums();
    return allShared.where((a) => a.ownerId == userId).toList();
  }

  // Get trending aquariums
  static Future<List<SharedAquarium>> getTrendingAquariums({
    int limit = 20,
  }) async {
    final allShared = await getSharedAquariums();
    
    // Sort by engagement score (views + likes + comments)
    allShared.sort((a, b) {
      final scoreA = a.stats.views + (a.stats.likes * 2) + (a.stats.comments * 3);
      final scoreB = b.stats.views + (b.stats.likes * 2) + (b.stats.comments * 3);
      return scoreB.compareTo(scoreA);
    });
    
    return allShared.take(limit).toList();
  }

  // Search shared aquariums
  static Future<List<SharedAquarium>> searchSharedAquariums({
    String? query,
    List<String>? tags,
    ShareVisibility? visibility,
  }) async {
    var aquariums = await getSharedAquariums();
    
    if (query != null && query.isNotEmpty) {
      final searchQuery = query.toLowerCase();
      aquariums = aquariums.where((a) =>
          a.aquariumName.toLowerCase().contains(searchQuery) ||
          a.ownerName.toLowerCase().contains(searchQuery) ||
          (a.description?.toLowerCase().contains(searchQuery) ?? false) ||
          a.tags.any((tag) => tag.toLowerCase().contains(searchQuery))
      ).toList();
    }
    
    if (tags != null && tags.isNotEmpty) {
      aquariums = aquariums.where((a) =>
          tags.any((tag) => a.tags.contains(tag))
      ).toList();
    }
    
    if (visibility != null) {
      aquariums = aquariums.where((a) => a.visibility == visibility).toList();
    }
    
    return aquariums;
  }

  // Update share settings
  static Future<void> updateShareSettings({
    required String sharedAquariumId,
    ShareVisibility? visibility,
    bool? allowComments,
    bool? allowLikes,
    List<String>? tags,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final aquariums = await getSharedAquariums();
    
    final index = aquariums.indexWhere((a) => a.id == sharedAquariumId);
    if (index != -1) {
      aquariums[index] = aquariums[index].copyWith(
        visibility: visibility,
        allowComments: allowComments,
        allowLikes: allowLikes,
        tags: tags,
      );
      
      await prefs.setString(
        _sharedAquariumsKey,
        jsonEncode(aquariums.map((a) => a.toJson()).toList()),
      );
    }
  }

  // Unshare aquarium
  static Future<void> unshareAquarium(String sharedAquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final aquariums = await getSharedAquariums();
    
    aquariums.removeWhere((a) => a.id == sharedAquariumId);
    
    await prefs.setString(
      _sharedAquariumsKey,
      jsonEncode(aquariums.map((a) => a.toJson()).toList()),
    );
  }

  // Like/Unlike aquarium
  static Future<void> toggleLike({
    required String sharedAquariumId,
    required String userId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    // Get likes data
    final likesData = prefs.getString(_likesKey);
    final Map<String, List<String>> likes = likesData != null
        ? Map<String, List<String>>.from(jsonDecode(likesData))
        : {};
    
    // Toggle like
    final aquariumLikes = likes[sharedAquariumId] ?? [];
    if (aquariumLikes.contains(userId)) {
      aquariumLikes.remove(userId);
    } else {
      aquariumLikes.add(userId);
    }
    likes[sharedAquariumId] = aquariumLikes;
    
    // Save likes
    await prefs.setString(_likesKey, jsonEncode(likes));
    
    // Update aquarium stats
    final aquariums = await getSharedAquariums();
    final index = aquariums.indexWhere((a) => a.id == sharedAquariumId);
    if (index != -1) {
      final stats = aquariums[index].stats;
      aquariums[index] = aquariums[index].copyWith(
        stats: SharedAquariumStats(
          views: stats.views,
          likes: aquariumLikes.length,
          comments: stats.comments,
          shares: stats.shares,
          rating: stats.rating,
          ratingCount: stats.ratingCount,
        ),
      );
      
      await prefs.setString(
        _sharedAquariumsKey,
        jsonEncode(aquariums.map((a) => a.toJson()).toList()),
      );
    }
  }

  // Add comment
  static Future<Comment> addComment({
    required String sharedAquariumId,
    required String userId,
    required String userName,
    String? userAvatar,
    required String content,
    String? parentId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    final comment = Comment(
      id: _uuid.v4(),
      sharedAquariumId: sharedAquariumId,
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      content: content,
      parentId: parentId,
      likes: [],
      createdAt: DateTime.now(),
    );
    
    // Save comment
    final comments = await getComments(sharedAquariumId);
    comments.add(comment);
    
    final allCommentsData = prefs.getString(_commentsKey);
    final Map<String, List<dynamic>> allComments = allCommentsData != null
        ? Map<String, List<dynamic>>.from(jsonDecode(allCommentsData))
        : {};
    
    allComments[sharedAquariumId] = comments.map((c) => c.toJson()).toList();
    await prefs.setString(_commentsKey, jsonEncode(allComments));
    
    // Update aquarium stats
    await _updateCommentCount(sharedAquariumId, comments.length);
    
    return comment;
  }

  // Get comments
  static Future<List<Comment>> getComments(String sharedAquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_commentsKey);
    
    if (data == null) return [];
    
    final Map<String, dynamic> allComments = jsonDecode(data);
    final List<dynamic> aquariumComments = allComments[sharedAquariumId] ?? [];
    
    return aquariumComments
        .map((json) => Comment.fromJson(json))
        .where((c) => !c.isDeleted)
        .toList();
  }

  // Follow/Unfollow user
  static Future<void> toggleFollow({
    required String userId,
    required String targetUserId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    final followingData = prefs.getString(_followingKey);
    final Map<String, List<String>> following = followingData != null
        ? Map<String, List<String>>.from(jsonDecode(followingData))
        : {};
    
    final userFollowing = following[userId] ?? [];
    if (userFollowing.contains(targetUserId)) {
      userFollowing.remove(targetUserId);
    } else {
      userFollowing.add(targetUserId);
    }
    following[userId] = userFollowing;
    
    await prefs.setString(_followingKey, jsonEncode(following));
  }

  // Get user profile
  static Future<SocialUser?> getUserProfile(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_socialUsersKey);
    
    if (data == null) return null;
    
    final Map<String, dynamic> users = jsonDecode(data);
    final userData = users[userId];
    
    return userData != null ? SocialUser.fromJson(userData) : null;
  }

  // Update view count
  static Future<void> incrementViewCount(String sharedAquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final aquariums = await getSharedAquariums();
    
    final index = aquariums.indexWhere((a) => a.id == sharedAquariumId);
    if (index != -1) {
      final stats = aquariums[index].stats;
      aquariums[index] = aquariums[index].copyWith(
        stats: SharedAquariumStats(
          views: stats.views + 1,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares,
          rating: stats.rating,
          ratingCount: stats.ratingCount,
        ),
      );
      
      await prefs.setString(
        _sharedAquariumsKey,
        jsonEncode(aquariums.map((a) => a.toJson()).toList()),
      );
    }
  }

  // Private helper to update comment count
  static Future<void> _updateCommentCount(String sharedAquariumId, int count) async {
    final prefs = await SharedPreferences.getInstance();
    final aquariums = await getSharedAquariums();
    
    final index = aquariums.indexWhere((a) => a.id == sharedAquariumId);
    if (index != -1) {
      final stats = aquariums[index].stats;
      aquariums[index] = aquariums[index].copyWith(
        stats: SharedAquariumStats(
          views: stats.views,
          likes: stats.likes,
          comments: count,
          shares: stats.shares,
          rating: stats.rating,
          ratingCount: stats.ratingCount,
        ),
      );
      
      await prefs.setString(
        _sharedAquariumsKey,
        jsonEncode(aquariums.map((a) => a.toJson()).toList()),
      );
    }
  }

  // Get popular tags
  static Future<List<String>> getPopularTags({int limit = 20}) async {
    final aquariums = await getSharedAquariums();
    final tagCount = <String, int>{};
    
    for (final aquarium in aquariums) {
      for (final tag in aquarium.tags) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1;
      }
    }
    
    final sortedTags = tagCount.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    
    return sortedTags
        .take(limit)
        .map((e) => e.key)
        .toList();
  }
}