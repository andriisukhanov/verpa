import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';
import '../models/shared_aquarium.dart';
import '../services/social_service.dart';

class ShareAquariumScreen extends StatefulWidget {
  final String? aquariumId;
  
  const ShareAquariumScreen({
    super.key,
    this.aquariumId,
  });

  @override
  State<ShareAquariumScreen> createState() => _ShareAquariumScreenState();
}

class _ShareAquariumScreenState extends State<ShareAquariumScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _tagsController = TextEditingController();
  
  Aquarium? _selectedAquarium;
  ShareVisibility _visibility = ShareVisibility.public;
  bool _allowComments = true;
  bool _allowLikes = true;
  bool _isLoading = false;
  Duration? _expiresIn;
  
  List<Aquarium> _aquariums = [];

  @override
  void initState() {
    super.initState();
    _loadAquariums();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _loadAquariums() {
    final state = context.read<AquariumBloc>().state;
    if (state is AquariumsLoaded) {
      setState(() {
        _aquariums = state.aquariums;
        if (widget.aquariumId != null) {
          _selectedAquarium = _aquariums.firstWhere(
            (a) => a.id == widget.aquariumId,
            orElse: () => _aquariums.first,
          );
        } else if (_aquariums.isNotEmpty) {
          _selectedAquarium = _aquariums.first;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Share Aquarium'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _aquariums.isEmpty
            ? _buildEmptyState()
            : _buildForm(),
      ),
    );
  }

  Widget _buildEmptyState() {
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
            'No aquariums to share',
            style: TextStyle(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          CustomButton(
            text: 'Create Aquarium',
            onPressed: () {
              context.push('/dashboard/add-aquarium');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Aquarium Selection
            _buildAquariumSelector(),
            
            const SizedBox(height: 24),
            
            // Description
            CustomTextField(
              controller: _descriptionController,
              labelText: 'Description (Optional)',
              hintText: 'Tell the community about your aquarium...',
              maxLines: 4,
              prefixIcon: Icons.description,
            ),
            
            const SizedBox(height: 20),
            
            // Tags
            CustomTextField(
              controller: _tagsController,
              labelText: 'Tags',
              hintText: 'e.g., reef, planted, freshwater (comma separated)',
              prefixIcon: Icons.tag,
              helperText: 'Add tags to help others find your aquarium',
            ),
            
            const SizedBox(height: 24),
            
            // Visibility Settings
            _buildVisibilitySection(),
            
            const SizedBox(height: 24),
            
            // Interaction Settings
            _buildInteractionSettings(),
            
            const SizedBox(height: 24),
            
            // Expiration Settings
            _buildExpirationSettings(),
            
            const SizedBox(height: 32),
            
            // Share Button
            CustomButton(
              text: 'Share Aquarium',
              icon: Icons.share,
              onPressed: _shareAquarium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAquariumSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Aquarium',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.borderColor,
              width: 1,
            ),
          ),
          child: DropdownButton<Aquarium>(
            value: _selectedAquarium,
            isExpanded: true,
            underline: const SizedBox(),
            icon: const Icon(Icons.arrow_drop_down),
            items: _aquariums.map((aquarium) {
              return DropdownMenuItem(
                value: aquarium,
                child: Row(
                  children: [
                    Icon(
                      Icons.water,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        aquarium.name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '${aquarium.volume}${aquarium.volumeUnit}',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedAquarium = value;
              });
            },
          ),
        ),
        if (_selectedAquarium != null) ...[
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  if (_selectedAquarium!.imageUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        _selectedAquarium!.imageUrl!,
                        width: 60,
                        height: 60,
                        fit: BoxFit.cover,
                      ),
                    )
                  else
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.water,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedAquarium!.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_selectedAquarium!.type} • ${_selectedAquarium!.volume}${_selectedAquarium!.volumeUnit}',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildVisibilitySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Visibility',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        ...ShareVisibility.values.map((visibility) {
          return RadioListTile<ShareVisibility>(
            value: visibility,
            groupValue: _visibility,
            onChanged: (value) {
              setState(() {
                _visibility = value!;
              });
            },
            title: Text(visibility.displayName),
            subtitle: Text(_getVisibilityDescription(visibility)),
            activeColor: AppTheme.primaryColor,
            contentPadding: EdgeInsets.zero,
          );
        }),
      ],
    );
  }

  Widget _buildInteractionSettings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Interaction Settings',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        SwitchListTile(
          value: _allowComments,
          onChanged: (value) {
            setState(() {
              _allowComments = value;
            });
          },
          title: const Text('Allow Comments'),
          subtitle: const Text('Let others comment on your aquarium'),
          activeColor: AppTheme.primaryColor,
          contentPadding: EdgeInsets.zero,
        ),
        SwitchListTile(
          value: _allowLikes,
          onChanged: (value) {
            setState(() {
              _allowLikes = value;
            });
          },
          title: const Text('Allow Likes'),
          subtitle: const Text('Let others like your aquarium'),
          activeColor: AppTheme.primaryColor,
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildExpirationSettings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Auto-Expire',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            Switch(
              value: _expiresIn != null,
              onChanged: (value) {
                setState(() {
                  _expiresIn = value ? const Duration(days: 30) : null;
                });
              },
              activeColor: AppTheme.primaryColor,
            ),
          ],
        ),
        if (_expiresIn != null) ...[
          const SizedBox(height: 8),
          Text(
            'Share will expire after:',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _buildExpirationChip('7 days', const Duration(days: 7)),
              _buildExpirationChip('30 days', const Duration(days: 30)),
              _buildExpirationChip('90 days', const Duration(days: 90)),
              _buildExpirationChip('1 year', const Duration(days: 365)),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildExpirationChip(String label, Duration duration) {
    final isSelected = _expiresIn == duration;
    
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _expiresIn = duration;
          });
        }
      },
      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primaryColor : null,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  String _getVisibilityDescription(ShareVisibility visibility) {
    switch (visibility) {
      case ShareVisibility.public:
        return 'Anyone can see your aquarium';
      case ShareVisibility.friends:
        return 'Only your friends can see your aquarium';
      case ShareVisibility.private:
        return 'Only you can see your aquarium';
    }
  }

  Future<void> _shareAquarium() async {
    if (_selectedAquarium == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an aquarium to share'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      // Parse tags
      final tags = _tagsController.text
          .split(',')
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList();
      
      final sharedAquarium = await SocialService.shareAquarium(
        aquarium: _selectedAquarium!,
        userId: 'current_user', // TODO: Get actual user ID
        userName: 'Current User', // TODO: Get actual user name
        description: _descriptionController.text.trim().isEmpty 
            ? null 
            : _descriptionController.text.trim(),
        visibility: _visibility,
        tags: tags,
        allowComments: _allowComments,
        allowLikes: _allowLikes,
        expiresIn: _expiresIn,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Aquarium shared successfully!'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        
        // Navigate to the shared aquarium
        context.pushReplacement('/shared-aquarium/${sharedAquarium.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share aquarium: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }
}