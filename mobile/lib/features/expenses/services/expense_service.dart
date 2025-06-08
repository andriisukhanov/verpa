import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/expense.dart';
import '../../barcode_scanner/models/product.dart';
import '../../barcode_scanner/services/barcode_service.dart';

class ExpenseService {
  static const String _expensesKey = 'verpa_expenses';
  static const String _budgetsKey = 'verpa_budgets';
  static const String _recurringExpensesKey = 'verpa_recurring_expenses';
  
  static final _uuid = const Uuid();

  // Create expense from scanned product
  static Future<Expense> createExpenseFromProduct({
    required ScannedProduct scannedProduct,
    ExpenseCategory? category,
    PaymentMethod? paymentMethod,
    String? notes,
  }) async {
    final expense = Expense(
      id: _uuid.v4(),
      aquariumId: scannedProduct.aquariumId,
      title: scannedProduct.product.name,
      description: scannedProduct.product.brand,
      amount: scannedProduct.purchasePrice,
      category: category ?? _getCategoryFromProduct(scannedProduct.product.category),
      date: scannedProduct.purchaseDate,
      paymentMethod: paymentMethod ?? PaymentMethod.cash,
      vendor: scannedProduct.store,
      linkedProductId: scannedProduct.id,
      notes: notes ?? scannedProduct.notes,
      tags: scannedProduct.product.tags,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await saveExpense(expense);
    return expense;
  }

  // Map product category to expense category
  static ExpenseCategory _getCategoryFromProduct(ProductCategory productCategory) {
    switch (productCategory) {
      case ProductCategory.food:
        return ExpenseCategory.food;
      case ProductCategory.medication:
        return ExpenseCategory.medication;
      case ProductCategory.waterConditioner:
      case ProductCategory.testKit:
        return ExpenseCategory.waterTreatment;
      case ProductCategory.equipment:
      case ProductCategory.filter:
      case ProductCategory.lighting:
      case ProductCategory.heating:
        return ExpenseCategory.equipment;
      case ProductCategory.decoration:
        return ExpenseCategory.decoration;
      case ProductCategory.plant:
        return ExpenseCategory.livestock;
      case ProductCategory.cleaning:
        return ExpenseCategory.maintenance;
      case ProductCategory.other:
        return ExpenseCategory.other;
    }
  }

  // Save expense
  static Future<void> saveExpense(Expense expense) async {
    final prefs = await SharedPreferences.getInstance();
    final expensesData = prefs.getString(_expensesKey);
    
    final List<dynamic> expenses = expensesData != null
        ? jsonDecode(expensesData)
        : [];
    
    // Remove existing expense with same ID if updating
    expenses.removeWhere((e) => e['id'] == expense.id);
    
    expenses.add(expense.toJson());
    
    await prefs.setString(_expensesKey, jsonEncode(expenses));
    
    // Update budget spent amounts
    await _updateBudgetSpent(expense.aquariumId);
    
    // Schedule next recurring expense if applicable
    if (expense.isRecurring && expense.recurrencePattern != null) {
      await _scheduleNextRecurringExpense(expense);
    }
  }

  // Get expenses for aquarium
  static Future<List<Expense>> getExpenses(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_expensesKey);
    
    if (data == null) return [];
    
    final List<dynamic> allExpenses = jsonDecode(data);
    
    return allExpenses
        .map((json) => Expense.fromJson(json))
        .where((e) => e.aquariumId == aquariumId)
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  // Get all expenses
  static Future<List<Expense>> getAllExpenses() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_expensesKey);
    
    if (data == null) return [];
    
    final List<dynamic> allExpenses = jsonDecode(data);
    
    return allExpenses
        .map((json) => Expense.fromJson(json))
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));
  }

  // Delete expense
  static Future<void> deleteExpense(String expenseId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_expensesKey);
    
    if (data == null) return;
    
    final List<dynamic> expenses = jsonDecode(data);
    expenses.removeWhere((e) => e['id'] == expenseId);
    
    await prefs.setString(_expensesKey, jsonEncode(expenses));
  }

  // Get expense statistics
  static Future<ExpenseStatistics> getStatistics(String aquariumId) async {
    final expenses = await getExpenses(aquariumId);
    
    if (expenses.isEmpty) {
      return ExpenseStatistics(
        totalSpent: 0,
        averageMonthly: 0,
        averageWeekly: 0,
        categoryBreakdown: {},
        monthlyTrend: {},
        topCategory: ExpenseCategory.other,
        topVendor: 'N/A',
        totalTransactions: 0,
        largestExpense: 0,
        smallestExpense: 0,
      );
    }
    
    // Calculate total spent
    double totalSpent = 0;
    for (final expense in expenses) {
      totalSpent += expense.amount;
    }
    
    // Calculate date range
    final sortedExpenses = List<Expense>.from(expenses)
      ..sort((a, b) => a.date.compareTo(b.date));
    final firstDate = sortedExpenses.first.date;
    final lastDate = sortedExpenses.last.date;
    final daysDiff = lastDate.difference(firstDate).inDays + 1;
    
    // Calculate averages
    final averageMonthly = totalSpent / (daysDiff / 30.44);
    final averageWeekly = totalSpent / (daysDiff / 7);
    
    // Category breakdown
    final categoryBreakdown = <ExpenseCategory, double>{};
    final categoryCount = <ExpenseCategory, int>{};
    for (final expense in expenses) {
      categoryBreakdown[expense.category] = 
          (categoryBreakdown[expense.category] ?? 0) + expense.amount;
      categoryCount[expense.category] = 
          (categoryCount[expense.category] ?? 0) + 1;
    }
    
    // Find top category
    final topCategory = categoryBreakdown.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
    
    // Monthly trend
    final monthlyTrend = <String, double>{};
    for (final expense in expenses) {
      final monthKey = '${expense.date.year}-${expense.date.month.toString().padLeft(2, '0')}';
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] ?? 0) + expense.amount;
    }
    
    // Vendor analysis
    final vendorSpending = <String, double>{};
    for (final expense in expenses) {
      if (expense.vendor != null) {
        vendorSpending[expense.vendor!] = 
            (vendorSpending[expense.vendor!] ?? 0) + expense.amount;
      }
    }
    
    final topVendor = vendorSpending.isNotEmpty
        ? vendorSpending.entries
            .reduce((a, b) => a.value > b.value ? a : b)
            .key
        : 'N/A';
    
    // Min/Max expenses
    final amounts = expenses.map((e) => e.amount).toList();
    final largestExpense = amounts.reduce((a, b) => a > b ? a : b);
    final smallestExpense = amounts.reduce((a, b) => a < b ? a : b);
    
    return ExpenseStatistics(
      totalSpent: totalSpent,
      averageMonthly: averageMonthly,
      averageWeekly: averageWeekly,
      categoryBreakdown: categoryBreakdown,
      monthlyTrend: monthlyTrend,
      topCategory: topCategory,
      topVendor: topVendor,
      totalTransactions: expenses.length,
      largestExpense: largestExpense,
      smallestExpense: smallestExpense,
    );
  }

  // Budget management
  static Future<void> saveBudget(Budget budget) async {
    final prefs = await SharedPreferences.getInstance();
    final budgetsData = prefs.getString(_budgetsKey);
    
    final List<dynamic> budgets = budgetsData != null
        ? jsonDecode(budgetsData)
        : [];
    
    // Remove existing budget with same ID if updating
    budgets.removeWhere((b) => b['id'] == budget.id);
    
    budgets.add(budget.toJson());
    
    await prefs.setString(_budgetsKey, jsonEncode(budgets));
  }

  // Get budgets for aquarium
  static Future<List<Budget>> getBudgets(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_budgetsKey);
    
    if (data == null) return [];
    
    final List<dynamic> allBudgets = jsonDecode(data);
    
    // Get budgets and calculate spent amounts
    final budgets = allBudgets
        .map((json) => Budget.fromJson(json))
        .where((b) => b.aquariumId == aquariumId && b.isActive)
        .toList();
    
    // Update spent amounts
    final expenses = await getExpenses(aquariumId);
    final updatedBudgets = <Budget>[];
    
    for (final budget in budgets) {
      double spent = 0;
      
      for (final expense in expenses) {
        if (_isExpenseInBudgetPeriod(expense, budget) &&
            (budget.categories.isEmpty || budget.categories.contains(expense.category))) {
          spent += expense.amount;
        }
      }
      
      updatedBudgets.add(Budget(
        id: budget.id,
        aquariumId: budget.aquariumId,
        name: budget.name,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        categories: budget.categories,
        isActive: budget.isActive,
        spent: spent,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      ));
    }
    
    return updatedBudgets;
  }

  // Check if expense is in budget period
  static bool _isExpenseInBudgetPeriod(Expense expense, Budget budget) {
    final now = DateTime.now();
    DateTime periodStart;
    DateTime periodEnd;
    
    switch (budget.period) {
      case BudgetPeriod.weekly:
        final weekday = now.weekday;
        periodStart = now.subtract(Duration(days: weekday - 1));
        periodEnd = periodStart.add(const Duration(days: 6));
        break;
      case BudgetPeriod.monthly:
        periodStart = DateTime(now.year, now.month, 1);
        periodEnd = DateTime(now.year, now.month + 1, 0);
        break;
      case BudgetPeriod.quarterly:
        final quarter = ((now.month - 1) ~/ 3);
        periodStart = DateTime(now.year, quarter * 3 + 1, 1);
        periodEnd = DateTime(now.year, quarter * 3 + 4, 0);
        break;
      case BudgetPeriod.yearly:
        periodStart = DateTime(now.year, 1, 1);
        periodEnd = DateTime(now.year, 12, 31);
        break;
    }
    
    return expense.date.isAfter(periodStart.subtract(const Duration(days: 1))) &&
           expense.date.isBefore(periodEnd.add(const Duration(days: 1)));
  }

  // Update budget spent amounts
  static Future<void> _updateBudgetSpent(String aquariumId) async {
    final budgets = await getBudgets(aquariumId);
    for (final budget in budgets) {
      await saveBudget(budget);
    }
  }

  // Delete budget
  static Future<void> deleteBudget(String budgetId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_budgetsKey);
    
    if (data == null) return;
    
    final List<dynamic> budgets = jsonDecode(data);
    budgets.removeWhere((b) => b['id'] == budgetId);
    
    await prefs.setString(_budgetsKey, jsonEncode(budgets));
  }

  // Recurring expenses
  static Future<void> _scheduleNextRecurringExpense(Expense expense) async {
    if (!expense.isRecurring || expense.recurrencePattern == null) return;
    
    final nextDate = expense.recurrencePattern!.calculateNextDate(expense.date);
    if (nextDate == null) return;
    
    // Check if we should create the next occurrence
    if (expense.recurrencePattern!.endDate != null &&
        nextDate.isAfter(expense.recurrencePattern!.endDate!)) {
      return;
    }
    
    // Store recurring expense template
    final prefs = await SharedPreferences.getInstance();
    final recurringData = prefs.getString(_recurringExpensesKey);
    
    final List<dynamic> recurringExpenses = recurringData != null
        ? jsonDecode(recurringData)
        : [];
    
    // Remove existing template with same ID
    recurringExpenses.removeWhere((e) => e['id'] == expense.id);
    
    recurringExpenses.add({
      'templateId': expense.id,
      'nextDate': nextDate.toIso8601String(),
      'expense': expense.toJson(),
    });
    
    await prefs.setString(_recurringExpensesKey, jsonEncode(recurringExpenses));
  }

  // Process recurring expenses
  static Future<void> processRecurringExpenses() async {
    final prefs = await SharedPreferences.getInstance();
    final recurringData = prefs.getString(_recurringExpensesKey);
    
    if (recurringData == null) return;
    
    final List<dynamic> recurringExpenses = jsonDecode(recurringData);
    final now = DateTime.now();
    final processedIds = <String>[];
    
    for (final template in recurringExpenses) {
      final nextDate = DateTime.parse(template['nextDate']);
      
      if (nextDate.isBefore(now) || nextDate.isAtSameMomentAs(now)) {
        // Create new expense from template
        final templateExpense = Expense.fromJson(template['expense']);
        
        final newExpense = templateExpense.copyWith(
          id: _uuid.v4(),
          date: nextDate,
          createdAt: now,
          updatedAt: now,
        );
        
        await saveExpense(newExpense);
        processedIds.add(template['templateId']);
      }
    }
    
    // Remove processed templates
    recurringExpenses.removeWhere((t) => processedIds.contains(t['templateId']));
    await prefs.setString(_recurringExpensesKey, jsonEncode(recurringExpenses));
  }

  // Export expenses to CSV
  static String exportToCSV(List<Expense> expenses) {
    final csv = StringBuffer();
    
    // Headers
    csv.writeln('Date,Title,Category,Amount,Payment Method,Vendor,Notes');
    
    // Data
    for (final expense in expenses) {
      csv.writeln(
        '${expense.date.toIso8601String()},'
        '"${expense.title}",'
        '${expense.category.displayName},'
        '${expense.amount},'
        '${expense.paymentMethod.displayName},'
        '"${expense.vendor ?? ''}",'
        '"${expense.notes ?? ''}"'
      );
    }
    
    return csv.toString();
  }

  // Get expenses by date range
  static Future<List<Expense>> getExpensesByDateRange({
    required String aquariumId,
    required DateTime startDate,
    required DateTime endDate,
    ExpenseCategory? category,
  }) async {
    final expenses = await getExpenses(aquariumId);
    
    return expenses.where((expense) {
      final inDateRange = expense.date.isAfter(startDate.subtract(const Duration(days: 1))) &&
                          expense.date.isBefore(endDate.add(const Duration(days: 1)));
      final matchesCategory = category == null || expense.category == category;
      
      return inDateRange && matchesCategory;
    }).toList();
  }

  // Search expenses
  static Future<List<Expense>> searchExpenses({
    required String aquariumId,
    required String query,
  }) async {
    final expenses = await getExpenses(aquariumId);
    final searchQuery = query.toLowerCase();
    
    return expenses.where((expense) {
      return expense.title.toLowerCase().contains(searchQuery) ||
             (expense.description?.toLowerCase().contains(searchQuery) ?? false) ||
             (expense.vendor?.toLowerCase().contains(searchQuery) ?? false) ||
             (expense.notes?.toLowerCase().contains(searchQuery) ?? false) ||
             expense.tags.any((tag) => tag.toLowerCase().contains(searchQuery));
    }).toList();
  }
}