import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SpeciesSelector extends StatefulWidget {
  final String? initialSpecies;
  final String? initialScientificName;
  final Function(String species, String? scientificName) onSpeciesSelected;

  const SpeciesSelector({
    super.key,
    this.initialSpecies,
    this.initialScientificName,
    required this.onSpeciesSelected,
  });

  @override
  State<SpeciesSelector> createState() => _SpeciesSelectorState();
}

class _SpeciesSelectorState extends State<SpeciesSelector> {
  String _searchQuery = '';
  String _selectedCategory = 'all';
  
  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.search),
      onPressed: () => _showSpeciesSelector(context),
    );
  }

  void _showSpeciesSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    'Select Species',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Search
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search species...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Category Filter
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildCategoryChip('all', 'All'),
                        _buildCategoryChip('fish', 'Fish'),
                        _buildCategoryChip('coral', 'Coral'),
                        _buildCategoryChip('invertebrate', 'Invertebrates'),
                        _buildCategoryChip('plant', 'Plants'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            const Divider(),
            
            // Species List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.only(bottom: 16),
                itemCount: _getFilteredSpecies().length,
                itemBuilder: (context, index) {
                  final species = _getFilteredSpecies()[index];
                  return ListTile(
                    leading: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _getCategoryColor(species['category']).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getCategoryIcon(species['category']),
                        color: _getCategoryColor(species['category']),
                      ),
                    ),
                    title: Text(species['common']),
                    subtitle: Text(
                      species['scientific'],
                      style: const TextStyle(fontStyle: FontStyle.italic),
                    ),
                    trailing: Chip(
                      label: Text(
                        species['difficulty'],
                        style: const TextStyle(fontSize: 12),
                      ),
                      backgroundColor: _getDifficultyColor(species['difficulty']).withOpacity(0.1),
                      labelStyle: TextStyle(
                        color: _getDifficultyColor(species['difficulty']),
                      ),
                    ),
                    onTap: () {
                      widget.onSpeciesSelected(
                        species['common'],
                        species['scientific'],
                      );
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String value, String label) {
    final isSelected = _selectedCategory == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCategory = value;
          });
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  List<Map<String, String>> _getFilteredSpecies() {
    List<Map<String, String>> species = _commonSpecies;
    
    // Filter by category
    if (_selectedCategory != 'all') {
      species = species.where((s) => s['category'] == _selectedCategory).toList();
    }
    
    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      species = species.where((s) =>
        s['common']!.toLowerCase().contains(query) ||
        s['scientific']!.toLowerCase().contains(query)
      ).toList();
    }
    
    return species;
  }

  IconData _getCategoryIcon(String? category) {
    switch (category) {
      case 'fish':
        return Icons.pets;
      case 'coral':
        return Icons.eco;
      case 'invertebrate':
        return Icons.bug_report;
      case 'plant':
        return Icons.grass;
      default:
        return Icons.pets;
    }
  }

  Color _getCategoryColor(String? category) {
    switch (category) {
      case 'fish':
        return Colors.blue;
      case 'coral':
        return Colors.orange;
      case 'invertebrate':
        return Colors.purple;
      case 'plant':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Color _getDifficultyColor(String? difficulty) {
    switch (difficulty) {
      case 'Easy':
        return Colors.green;
      case 'Moderate':
        return Colors.orange;
      case 'Difficult':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  // Common species database
  static const List<Map<String, String>> _commonSpecies = [
    // Fish
    {'common': 'Clownfish', 'scientific': 'Amphiprion ocellaris', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Blue Tang', 'scientific': 'Paracanthurus hepatus', 'category': 'fish', 'difficulty': 'Moderate'},
    {'common': 'Yellow Tang', 'scientific': 'Zebrasoma flavescens', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Angelfish', 'scientific': 'Pterophyllum scalare', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Neon Tetra', 'scientific': 'Paracheirodon innesi', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Cardinal Tetra', 'scientific': 'Paracheirodon axelrodi', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Betta Fish', 'scientific': 'Betta splendens', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Guppy', 'scientific': 'Poecilia reticulata', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Goldfish', 'scientific': 'Carassius auratus', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Discus', 'scientific': 'Symphysodon', 'category': 'fish', 'difficulty': 'Difficult'},
    {'common': 'Dwarf Gourami', 'scientific': 'Trichogaster lalius', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Corydoras', 'scientific': 'Corydoras sp.', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Pleco', 'scientific': 'Hypostomus plecostomus', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Royal Gramma', 'scientific': 'Gramma loreto', 'category': 'fish', 'difficulty': 'Easy'},
    {'common': 'Flame Angel', 'scientific': 'Centropyge loricula', 'category': 'fish', 'difficulty': 'Moderate'},
    
    // Corals
    {'common': 'Zoanthids', 'scientific': 'Zoanthus sp.', 'category': 'coral', 'difficulty': 'Easy'},
    {'common': 'Mushroom Coral', 'scientific': 'Discosoma sp.', 'category': 'coral', 'difficulty': 'Easy'},
    {'common': 'Green Star Polyps', 'scientific': 'Pachyclavularia sp.', 'category': 'coral', 'difficulty': 'Easy'},
    {'common': 'Hammer Coral', 'scientific': 'Euphyllia ancora', 'category': 'coral', 'difficulty': 'Moderate'},
    {'common': 'Torch Coral', 'scientific': 'Euphyllia glabrescens', 'category': 'coral', 'difficulty': 'Moderate'},
    {'common': 'Brain Coral', 'scientific': 'Trachyphyllia geoffroyi', 'category': 'coral', 'difficulty': 'Moderate'},
    {'common': 'Acropora', 'scientific': 'Acropora sp.', 'category': 'coral', 'difficulty': 'Difficult'},
    {'common': 'Montipora', 'scientific': 'Montipora sp.', 'category': 'coral', 'difficulty': 'Moderate'},
    
    // Invertebrates
    {'common': 'Cleaner Shrimp', 'scientific': 'Lysmata amboinensis', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Peppermint Shrimp', 'scientific': 'Lysmata wurdemanni', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Hermit Crab', 'scientific': 'Clibanarius sp.', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Turbo Snail', 'scientific': 'Turbo fluctuosa', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Nassarius Snail', 'scientific': 'Nassarius sp.', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Cherry Shrimp', 'scientific': 'Neocaridina davidi', 'category': 'invertebrate', 'difficulty': 'Easy'},
    {'common': 'Amano Shrimp', 'scientific': 'Caridina multidentata', 'category': 'invertebrate', 'difficulty': 'Easy'},
    
    // Plants
    {'common': 'Java Fern', 'scientific': 'Microsorum pteropus', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Anubias', 'scientific': 'Anubias barteri', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Amazon Sword', 'scientific': 'Echinodorus amazonicus', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Java Moss', 'scientific': 'Taxiphyllum barbieri', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Cryptocoryne', 'scientific': 'Cryptocoryne wendtii', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Vallisneria', 'scientific': 'Vallisneria spiralis', 'category': 'plant', 'difficulty': 'Easy'},
    {'common': 'Rotala', 'scientific': 'Rotala rotundifolia', 'category': 'plant', 'difficulty': 'Moderate'},
    {'common': 'Dwarf Baby Tears', 'scientific': 'Hemianthus callitrichoides', 'category': 'plant', 'difficulty': 'Difficult'},
  ];
}