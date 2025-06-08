import 'package:equatable/equatable.dart';

class SocialUser extends Equatable {
  final String id;
  final String username;
  final String? displayName;
  final String? avatar;
  final String? bio;
  final String? location;
  final int aquariumCount;
  final int followersCount;
  final int followingCount;
  final int sharedAquariumsCount;
  final bool isFollowing;
  final bool isFollower;
  final DateTime joinedAt;
  final List<String> badges;
  final double rating;

  const SocialUser({
    required this.id,
    required this.username,
    this.displayName,
    this.avatar,
    this.bio,
    this.location,
    required this.aquariumCount,
    required this.followersCount,
    required this.followingCount,
    required this.sharedAquariumsCount,
    required this.isFollowing,
    required this.isFollower,
    required this.joinedAt,
    required this.badges,
    required this.rating,
  });

  String get name => displayName ?? username;

  SocialUser copyWith({
    String? id,
    String? username,
    String? displayName,
    String? avatar,
    String? bio,
    String? location,
    int? aquariumCount,
    int? followersCount,
    int? followingCount,
    int? sharedAquariumsCount,
    bool? isFollowing,
    bool? isFollower,
    DateTime? joinedAt,
    List<String>? badges,
    double? rating,
  }) {
    return SocialUser(
      id: id ?? this.id,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      avatar: avatar ?? this.avatar,
      bio: bio ?? this.bio,
      location: location ?? this.location,
      aquariumCount: aquariumCount ?? this.aquariumCount,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      sharedAquariumsCount: sharedAquariumsCount ?? this.sharedAquariumsCount,
      isFollowing: isFollowing ?? this.isFollowing,
      isFollower: isFollower ?? this.isFollower,
      joinedAt: joinedAt ?? this.joinedAt,
      badges: badges ?? this.badges,
      rating: rating ?? this.rating,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'displayName': displayName,
      'avatar': avatar,
      'bio': bio,
      'location': location,
      'aquariumCount': aquariumCount,
      'followersCount': followersCount,
      'followingCount': followingCount,
      'sharedAquariumsCount': sharedAquariumsCount,
      'isFollowing': isFollowing,
      'isFollower': isFollower,
      'joinedAt': joinedAt.toIso8601String(),
      'badges': badges,
      'rating': rating,
    };
  }

  factory SocialUser.fromJson(Map<String, dynamic> json) {
    return SocialUser(
      id: json['id'],
      username: json['username'],
      displayName: json['displayName'],
      avatar: json['avatar'],
      bio: json['bio'],
      location: json['location'],
      aquariumCount: json['aquariumCount'] ?? 0,
      followersCount: json['followersCount'] ?? 0,
      followingCount: json['followingCount'] ?? 0,
      sharedAquariumsCount: json['sharedAquariumsCount'] ?? 0,
      isFollowing: json['isFollowing'] ?? false,
      isFollower: json['isFollower'] ?? false,
      joinedAt: DateTime.parse(json['joinedAt']),
      badges: List<String>.from(json['badges'] ?? []),
      rating: (json['rating'] ?? 0.0).toDouble(),
    );
  }

  @override
  List<Object?> get props => [
    id,
    username,
    displayName,
    avatar,
    bio,
    location,
    aquariumCount,
    followersCount,
    followingCount,
    sharedAquariumsCount,
    isFollowing,
    isFollower,
    joinedAt,
    badges,
    rating,
  ];
}