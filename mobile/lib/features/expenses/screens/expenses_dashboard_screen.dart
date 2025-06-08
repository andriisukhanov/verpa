import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/expense.dart';
import '../services/expense_service.dart';
import 'widgets/expense_summary_card.dart';
import 'widgets/budget_card.dart';
import 'widgets/category_chart.dart';

class ExpensesDashboardScreen extends StatefulWidget {
  final String aquariumId;

  const ExpensesDashboardScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<ExpensesDashboardScreen> createState() => _ExpensesDashboardScreenState();
}

class _ExpensesDashboardScreenState extends State<ExpensesDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Expense> _expenses = [];
  List<Budget> _budgets = [];
  ExpenseStatistics? _statistics;
  bool _isLoading = true;
  DateTime _selectedMonth = DateTime.now();

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
    setState(() => _isLoading = true);
    
    try {
      final expenses = await ExpenseService.getExpenses(widget.aquariumId);
      final budgets = await ExpenseService.getBudgets(widget.aquariumId);
      final statistics = await ExpenseService.getStatistics(widget.aquariumId);
      
      setState(() {
        _expenses = expenses;
        _budgets = budgets;
        _statistics = statistics;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading expenses: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  List<Expense> get _currentMonthExpenses {
    return _expenses.where((expense) {
      return expense.date.year == _selectedMonth.year &&
             expense.date.month == _selectedMonth.month;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Expense Tracker'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Expenses'),
            Tab(text: 'Budgets'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _exportExpenses,
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            _buildExpensesTab(),
            _buildBudgetsTab(),
          ],
        ),
      ),
      floatingActionButton: _buildFAB(),
    );
  }

  Widget _buildOverviewTab() {
    if (_statistics == null) {
      return const Center(
        child: Text('No expense data available'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary Cards
          ExpenseSummaryCard(statistics: _statistics!),
          
          const SizedBox(height: 16),
          
          // Active Budgets
          if (_budgets.isNotEmpty) ...[
            Text(
              'Active Budgets',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ..._budgets.take(2).map((budget) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: BudgetCard(
                  budget: budget,
                  onTap: () {
                    _tabController.animateTo(2);
                  },
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 24),
          
          // Category Breakdown
          Text(
            'Spending by Category',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          SizedBox(
            height: 300,
            child: CategoryChart(
              categoryBreakdown: _statistics!.categoryBreakdown,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Monthly Trend
          Text(
            'Monthly Spending Trend',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          SizedBox(
            height: 200,
            child: _buildMonthlyTrendChart(),
          ),
          
          const SizedBox(height: 24),
          
          // Recent Expenses
          Text(
            'Recent Expenses',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          
          ..._expenses.take(5).map((expense) => 
            _buildExpenseItem(expense),
          ),
          
          if (_expenses.length > 5)
            TextButton(
              onPressed: () {
                _tabController.animateTo(1);
              },
              child: Text(
                'View All (${_expenses.length})',
                style: TextStyle(color: AppTheme.primaryColor),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildExpensesTab() {
    if (_expenses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long,
              size: 80,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Expenses Yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start tracking your aquarium expenses',
              style: TextStyle(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            CustomButton(
              text: 'Add First Expense',
              icon: Icons.add,
              onPressed: () {
                context.push('/add-expense/${widget.aquariumId}');
              },
              fullWidth: false,
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Month Selector
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () {
                  setState(() {
                    _selectedMonth = DateTime(
                      _selectedMonth.year,
                      _selectedMonth.month - 1,
                    );
                  });
                },
              ),
              Text(
                DateFormat('MMMM yyyy').format(_selectedMonth),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: _selectedMonth.month == DateTime.now().month &&
                        _selectedMonth.year == DateTime.now().year
                    ? null
                    : () {
                        setState(() {
                          _selectedMonth = DateTime(
                            _selectedMonth.year,
                            _selectedMonth.month + 1,
                          );
                        });
                      },
              ),
            ],
          ),
        ),
        
        // Month Total
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total for ${DateFormat('MMMM').format(_selectedMonth)}',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              Text(
                '\$${_currentMonthExpenses.fold(0.0, (sum, e) => sum + e.amount).toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Expenses List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _currentMonthExpenses.length,
            itemBuilder: (context, index) {
              return _buildExpenseItem(_currentMonthExpenses[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBudgetsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Add Budget Button
          CustomButton(
            text: 'Create New Budget',
            icon: Icons.add_chart,
            onPressed: () {
              context.push('/add-budget/${widget.aquariumId}');
            },
          ),
          
          const SizedBox(height: 24),
          
          if (_budgets.isEmpty) ...[
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.account_balance_wallet,
                    size: 80,
                    color: AppTheme.greyColor,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'No Budgets Set',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create budgets to track your spending',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            Text(
              'Active Budgets',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            ..._budgets.map((budget) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: BudgetCard(
                  budget: budget,
                  onTap: () {
                    context.push('/budget-details/${budget.id}', extra: budget);
                  },
                  onEdit: () {
                    context.push('/edit-budget/${budget.id}', extra: budget);
                  },
                  onDelete: () {
                    _confirmDeleteBudget(budget);
                  },
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildExpenseItem(Expense expense) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          context.push('/expense-details/${expense.id}', extra: expense);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Category Icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: expense.category.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  expense.category.icon,
                  color: expense.category.color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      expense.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          expense.category.displayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: expense.category.color,
                          ),
                        ),
                        if (expense.vendor != null) ...[
                          Text(
                            ' • ',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              expense.vendor!,
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              
              // Amount and Date
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${expense.amount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    DateFormat('MMM d').format(expense.date),
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
              
              // Recurring indicator
              if (expense.isRecurring) ...[
                const SizedBox(width: 8),
                Icon(
                  Icons.autorenew,
                  size: 16,
                  color: AppTheme.textSecondary,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlyTrendChart() {
    if (_statistics == null || _statistics!.monthlyTrend.isEmpty) {
      return Center(
        child: Text(
          'Not enough data for trend',
          style: TextStyle(color: AppTheme.textSecondary),
        ),
      );
    }

    final sortedEntries = _statistics!.monthlyTrend.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    
    // Take last 6 months
    final displayEntries = sortedEntries.length > 6
        ? sortedEntries.sublist(sortedEntries.length - 6)
        : sortedEntries;
    
    final maxSpending = displayEntries
        .map((e) => e.value)
        .reduce((a, b) => a > b ? a : b);

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxSpending / 4,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: AppTheme.greyColor.withOpacity(0.2),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 45,
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
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= displayEntries.length) return const Text('');
                final month = displayEntries[value.toInt()].key;
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
        lineBarsData: [
          LineChartBarData(
            spots: displayEntries.asMap().entries.map((entry) {
              return FlSpot(entry.key.toDouble(), entry.value.value);
            }).toList(),
            isCurved: true,
            color: AppTheme.primaryColor,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) {
                return FlDotCirclePainter(
                  radius: 4,
                  color: AppTheme.primaryColor,
                  strokeWidth: 2,
                  strokeColor: Colors.white,
                );
              },
            ),
            belowBarData: BarAreaData(
              show: true,
              color: AppTheme.primaryColor.withOpacity(0.1),
            ),
          ),
        ],
        maxY: maxSpending * 1.2,
        minY: 0,
      ),
    );
  }

  Widget? _buildFAB() {
    if (_tabController.index == 1) {
      // Expenses tab
      return FloatingActionButton(
        onPressed: () {
          context.push('/add-expense/${widget.aquariumId}');
        },
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add),
      );
    }
    return null;
  }

  void _confirmDeleteBudget(Budget budget) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Budget'),
        content: Text('Are you sure you want to delete "${budget.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ExpenseService.deleteBudget(budget.id);
              _loadData();
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _exportExpenses() async {
    try {
      final csv = ExpenseService.exportToCSV(_expenses);
      
      // In a real app, you would save this to a file or share it
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Expenses exported successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error exporting expenses: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }
}