import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/product.dart';
import '../services/barcode_service.dart';

class ProductInventoryScreen extends StatefulWidget {
  final String? aquariumId;

  const ProductInventoryScreen({
    super.key,
    this.aquariumId,
  });

  @override
  State<ProductInventoryScreen> createState() => _ProductInventoryScreenState();
}

class _ProductInventoryScreenState extends State<ProductInventoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ScannedProduct> _allProducts = [];
  Map<String, dynamic> _statistics = {};
  bool _isLoading = true;
  ProductCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final products = widget.aquariumId != null
          ? await BarcodeService.getScannedProducts(widget.aquariumId!)
          : await BarcodeService.getAllScannedProducts();
      
      final stats = await BarcodeService.getProductStatistics();
      
      setState(() {
        _allProducts = products;
        _statistics = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  List<ScannedProduct> get _filteredProducts {
    if (_selectedCategory == null) return _allProducts;
    return _allProducts
        .where((p) => p.product.category == _selectedCategory)
        .toList();
  }

  List<ScannedProduct> get _expiringProducts {
    final now = DateTime.now();
    return _allProducts
        .where((p) => 
            p.expiryDate != null && 
            p.expiryDate!.isAfter(now) &&
            p.expiryDate!.difference(now).inDays <= 30)
        .toList()
      ..sort((a, b) => a.expiryDate!.compareTo(b.expiryDate!));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.aquariumId != null ? 'Aquarium Inventory' : 'Product Inventory'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Products'),
            Tab(text: 'Statistics'),
            Tab(text: 'Expiring'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {
              context.push('/barcode-scanner', extra: {
                'aquariumId': widget.aquariumId,
              });
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildProductsTab(),
                _buildStatisticsTab(),
                _buildExpiringTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          context.push('/add-product/manual', extra: {
            'aquariumId': widget.aquariumId,
          });
        },
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildProductsTab() {
    if (_filteredProducts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inventory_2,
              size: 80,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Products',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start by scanning or adding products',
              style: TextStyle(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            CustomButton(
              text: 'Scan Product',
              icon: Icons.qr_code_scanner,
              onPressed: () {
                context.push('/barcode-scanner', extra: {
                  'aquariumId': widget.aquariumId,
                });
              },
              fullWidth: false,
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Category Filter
        Container(
          height: 50,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: [
              _buildCategoryChip(null, 'All'),
              ...ProductCategory.values.map((category) =>
                  _buildCategoryChip(category, category.displayName)),
            ],
          ),
        ),
        
        // Products List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _filteredProducts.length,
            itemBuilder: (context, index) {
              final scannedProduct = _filteredProducts[index];
              return _buildProductCard(scannedProduct);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryChip(ProductCategory? category, String label) {
    final isSelected = _selectedCategory == category;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (category != null) ...[
              Icon(
                category.icon,
                size: 16,
                color: isSelected ? Colors.white : category.color,
              ),
              const SizedBox(width: 4),
            ],
            Text(label),
          ],
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCategory = selected ? category : null;
          });
        },
        backgroundColor: category?.color.withOpacity(0.1),
        selectedColor: category?.color ?? AppTheme.primaryColor,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : null,
        ),
      ),
    );
  }

  Widget _buildProductCard(ScannedProduct scannedProduct) {
    final product = scannedProduct.product;
    final daysUntilExpiry = scannedProduct.expiryDate != null
        ? scannedProduct.expiryDate!.difference(DateTime.now()).inDays
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          context.push('/product/${product.id}', extra: product);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Product Icon
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: product.category.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  product.category.icon,
                  color: product.category.color,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              
              // Product Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (product.brand != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        product.brand!,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '${scannedProduct.quantity} ${scannedProduct.unit ?? 'units'}',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '•',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '\$${scannedProduct.purchasePrice.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Status
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    DateFormat('MMM d').format(scannedProduct.purchaseDate),
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  if (daysUntilExpiry != null) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getExpiryColor(daysUntilExpiry).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        daysUntilExpiry <= 0
                            ? 'Expired'
                            : '$daysUntilExpiry days',
                        style: TextStyle(
                          fontSize: 11,
                          color: _getExpiryColor(daysUntilExpiry),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatisticsTab() {
    final totalProducts = _statistics['totalProducts'] ?? 0;
    final totalSpent = _statistics['totalSpent'] ?? 0.0;
    final categoryCounts = _statistics['categoryCounts'] ?? {};
    final monthlySpending = _statistics['monthlySpending'] ?? {};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overview Cards
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Total Products',
                  totalProducts.toString(),
                  Icons.inventory_2,
                  AppTheme.primaryColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Total Spent',
                  '\$${totalSpent.toStringAsFixed(2)}',
                  Icons.attach_money,
                  AppTheme.successColor,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Categories',
                  categoryCounts.length.toString(),
                  Icons.category,
                  AppTheme.secondaryColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Expiring Soon',
                  (_statistics['expiringProducts'] ?? 0).toString(),
                  Icons.warning,
                  AppTheme.warningColor,
                ),
              ),
            ],
          ),
          
          // Category Distribution
          if (categoryCounts.isNotEmpty) ...[
            const SizedBox(height: 32),
            Text(
              'Products by Category',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...(categoryCounts.entries.toList()
              ..sort((a, b) => b.value.compareTo(a.value)))
                .map((entry) => _buildCategoryBar(entry.key, entry.value, totalProducts)),
          ],
          
          // Monthly Spending Chart
          if (monthlySpending.isNotEmpty) ...[
            const SizedBox(height: 32),
            Text(
              'Monthly Spending',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: _buildSpendingChart(monthlySpending),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 24),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBar(ProductCategory category, int count, int total) {
    final percentage = (count / total * 100).round();
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            category.icon,
            size: 20,
            color: category.color,
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 100,
            child: Text(
              category.displayName,
              style: const TextStyle(fontSize: 14),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Stack(
              children: [
                Container(
                  height: 24,
                  decoration: BoxDecoration(
                    color: AppTheme.greyColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: count / total,
                  child: Container(
                    height: 24,
                    decoration: BoxDecoration(
                      color: category.color,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$count ($percentage%)',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpendingChart(Map<String, double> monthlySpending) {
    final sortedEntries = monthlySpending.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    
    final maxSpending = sortedEntries
        .map((e) => e.value)
        .reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        barGroups: sortedEntries.asMap().entries.map((entry) {
          final index = entry.key;
          final data = entry.value;
          
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: data.value,
                color: AppTheme.primaryColor,
                width: 20,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
              ),
            ],
          );
        }).toList(),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Text(
                  '\$${value.toInt()}',
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= sortedEntries.length) return const Text('');
                final month = sortedEntries[value.toInt()].key;
                return Text(
                  DateFormat('MMM').format(DateTime.parse('$month-01')),
                  style: const TextStyle(fontSize: 10),
                );
              },
            ),
          ),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxSpending / 4,
        ),
        maxY: maxSpending * 1.2,
      ),
    );
  }

  Widget _buildExpiringTab() {
    if (_expiringProducts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle,
              size: 80,
              color: AppTheme.successColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Expiring Products',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'All your products are fresh!',
              style: TextStyle(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _expiringProducts.length,
      itemBuilder: (context, index) {
        final scannedProduct = _expiringProducts[index];
        final daysUntilExpiry = scannedProduct.expiryDate!
            .difference(DateTime.now())
            .inDays;
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: _getExpiryColor(daysUntilExpiry).withOpacity(0.05),
          child: ListTile(
            leading: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getExpiryColor(daysUntilExpiry).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.timer,
                color: _getExpiryColor(daysUntilExpiry),
              ),
            ),
            title: Text(
              scannedProduct.product.name,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (scannedProduct.product.brand != null)
                  Text(scannedProduct.product.brand!),
                Text(
                  'Expires: ${DateFormat('MMMM d, yyyy').format(scannedProduct.expiryDate!)}',
                  style: TextStyle(
                    color: _getExpiryColor(daysUntilExpiry),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getExpiryColor(daysUntilExpiry).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                daysUntilExpiry == 0
                    ? 'Today'
                    : daysUntilExpiry == 1
                        ? 'Tomorrow'
                        : '$daysUntilExpiry days',
                style: TextStyle(
                  color: _getExpiryColor(daysUntilExpiry),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            onTap: () {
              context.push('/product/${scannedProduct.product.id}', 
                  extra: scannedProduct.product);
            },
          ),
        );
      },
    );
  }

  Color _getExpiryColor(int daysUntilExpiry) {
    if (daysUntilExpiry <= 0) return AppTheme.errorColor;
    if (daysUntilExpiry <= 7) return AppTheme.errorColor;
    if (daysUntilExpiry <= 30) return AppTheme.warningColor;
    return AppTheme.successColor;
  }
}

extension on ProductCategory {
  Color get color {
    switch (this) {
      case ProductCategory.food:
        return Colors.orange;
      case ProductCategory.medication:
        return Colors.red;
      case ProductCategory.waterConditioner:
        return Colors.blue;
      case ProductCategory.testKit:
        return Colors.purple;
      case ProductCategory.equipment:
        return Colors.grey;
      case ProductCategory.filter:
        return Colors.cyan;
      case ProductCategory.decoration:
        return Colors.brown;
      case ProductCategory.plant:
        return Colors.green;
      case ProductCategory.lighting:
        return Colors.yellow[700]!;
      case ProductCategory.heating:
        return Colors.deepOrange;
      case ProductCategory.cleaning:
        return Colors.teal;
      case ProductCategory.other:
        return Colors.blueGrey;
    }
  }
}