import 'package:equatable/equatable.dart';

class Comment extends Equatable {
  final String id;
  final String sharedAquariumId;
  final String userId;
  final String userName;
  final String? userAvatar;
  final String content;
  final String? parentId; // For nested replies
  final List<String> likes;
  final DateTime createdAt;
  final DateTime? editedAt;
  final bool isDeleted;

  const Comment({
    required this.id,
    required this.sharedAquariumId,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.content,
    this.parentId,
    required this.likes,
    required this.createdAt,
    this.editedAt,
    this.isDeleted = false,
  });

  int get likeCount => likes.length;
  bool isLikedBy(String userId) => likes.contains(userId);
  bool get isReply => parentId != null;

  Comment copyWith({
    String? id,
    String? sharedAquariumId,
    String? userId,
    String? userName,
    String? userAvatar,
    String? content,
    String? parentId,
    List<String>? likes,
    DateTime? createdAt,
    DateTime? editedAt,
    bool? isDeleted,
  }) {
    return Comment(
      id: id ?? this.id,
      sharedAquariumId: sharedAquariumId ?? this.sharedAquariumId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userAvatar: userAvatar ?? this.userAvatar,
      content: content ?? this.content,
      parentId: parentId ?? this.parentId,
      likes: likes ?? this.likes,
      createdAt: createdAt ?? this.createdAt,
      editedAt: editedAt ?? this.editedAt,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sharedAquariumId': sharedAquariumId,
      'userId': userId,
      'userName': userName,
      'userAvatar': userAvatar,
      'content': content,
      'parentId': parentId,
      'likes': likes,
      'createdAt': createdAt.toIso8601String(),
      'editedAt': editedAt?.toIso8601String(),
      'isDeleted': isDeleted,
    };
  }

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'],
      sharedAquariumId: json['sharedAquariumId'],
      userId: json['userId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      content: json['content'],
      parentId: json['parentId'],
      likes: List<String>.from(json['likes'] ?? []),
      createdAt: DateTime.parse(json['createdAt']),
      editedAt: json['editedAt'] != null 
          ? DateTime.parse(json['editedAt'])
          : null,
      isDeleted: json['isDeleted'] ?? false,
    );
  }

  @override
  List<Object?> get props => [
    id,
    sharedAquariumId,
    userId,
    userName,
    userAvatar,
    content,
    parentId,
    likes,
    createdAt,
    editedAt,
    isDeleted,
  ];
}