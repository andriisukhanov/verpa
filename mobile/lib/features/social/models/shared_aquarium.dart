import 'package:equatable/equatable.dart';

class SharedAquarium extends Equatable {
  final String id;
  final String aquariumId;
  final String aquariumName;
  final String ownerId;
  final String ownerName;
  final String? ownerAvatar;
  final String? description;
  final String? imageUrl;
  final ShareVisibility visibility;
  final List<String> tags;
  final SharedAquariumStats stats;
  final bool allowComments;
  final bool allowLikes;
  final DateTime sharedAt;
  final DateTime? expiresAt;

  const SharedAquarium({
    required this.id,
    required this.aquariumId,
    required this.aquariumName,
    required this.ownerId,
    required this.ownerName,
    this.ownerAvatar,
    this.description,
    this.imageUrl,
    required this.visibility,
    required this.tags,
    required this.stats,
    required this.allowComments,
    required this.allowLikes,
    required this.sharedAt,
    this.expiresAt,
  });

  SharedAquarium copyWith({
    String? id,
    String? aquariumId,
    String? aquariumName,
    String? ownerId,
    String? ownerName,
    String? ownerAvatar,
    String? description,
    String? imageUrl,
    ShareVisibility? visibility,
    List<String>? tags,
    SharedAquariumStats? stats,
    bool? allowComments,
    bool? allowLikes,
    DateTime? sharedAt,
    DateTime? expiresAt,
  }) {
    return SharedAquarium(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      aquariumName: aquariumName ?? this.aquariumName,
      ownerId: ownerId ?? this.ownerId,
      ownerName: ownerName ?? this.ownerName,
      ownerAvatar: ownerAvatar ?? this.ownerAvatar,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      visibility: visibility ?? this.visibility,
      tags: tags ?? this.tags,
      stats: stats ?? this.stats,
      allowComments: allowComments ?? this.allowComments,
      allowLikes: allowLikes ?? this.allowLikes,
      sharedAt: sharedAt ?? this.sharedAt,
      expiresAt: expiresAt ?? this.expiresAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'aquariumName': aquariumName,
      'ownerId': ownerId,
      'ownerName': ownerName,
      'ownerAvatar': ownerAvatar,
      'description': description,
      'imageUrl': imageUrl,
      'visibility': visibility.name,
      'tags': tags,
      'stats': stats.toJson(),
      'allowComments': allowComments,
      'allowLikes': allowLikes,
      'sharedAt': sharedAt.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }

  factory SharedAquarium.fromJson(Map<String, dynamic> json) {
    return SharedAquarium(
      id: json['id'],
      aquariumId: json['aquariumId'],
      aquariumName: json['aquariumName'],
      ownerId: json['ownerId'],
      ownerName: json['ownerName'],
      ownerAvatar: json['ownerAvatar'],
      description: json['description'],
      imageUrl: json['imageUrl'],
      visibility: ShareVisibility.values.firstWhere(
        (v) => v.name == json['visibility'],
        orElse: () => ShareVisibility.public,
      ),
      tags: List<String>.from(json['tags'] ?? []),
      stats: SharedAquariumStats.fromJson(json['stats']),
      allowComments: json['allowComments'] ?? true,
      allowLikes: json['allowLikes'] ?? true,
      sharedAt: DateTime.parse(json['sharedAt']),
      expiresAt: json['expiresAt'] != null 
          ? DateTime.parse(json['expiresAt'])
          : null,
    );
  }

  @override
  List<Object?> get props => [
    id,
    aquariumId,
    aquariumName,
    ownerId,
    ownerName,
    ownerAvatar,
    description,
    imageUrl,
    visibility,
    tags,
    stats,
    allowComments,
    allowLikes,
    sharedAt,
    expiresAt,
  ];
}

enum ShareVisibility {
  public('public', 'Public'),
  friends('friends', 'Friends Only'),
  private('private', 'Private');

  final String name;
  final String displayName;

  const ShareVisibility(this.name, this.displayName);
}

class SharedAquariumStats extends Equatable {
  final int views;
  final int likes;
  final int comments;
  final int shares;
  final double rating;
  final int ratingCount;

  const SharedAquariumStats({
    required this.views,
    required this.likes,
    required this.comments,
    required this.shares,
    required this.rating,
    required this.ratingCount,
  });

  factory SharedAquariumStats.empty() {
    return const SharedAquariumStats(
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      rating: 0.0,
      ratingCount: 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'views': views,
      'likes': likes,
      'comments': comments,
      'shares': shares,
      'rating': rating,
      'ratingCount': ratingCount,
    };
  }

  factory SharedAquariumStats.fromJson(Map<String, dynamic> json) {
    return SharedAquariumStats(
      views: json['views'] ?? 0,
      likes: json['likes'] ?? 0,
      comments: json['comments'] ?? 0,
      shares: json['shares'] ?? 0,
      rating: (json['rating'] ?? 0).toDouble(),
      ratingCount: json['ratingCount'] ?? 0,
    );
  }

  @override
  List<Object> get props => [views, likes, comments, shares, rating, ratingCount];
}