import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class Expense extends Equatable {
  final String id;
  final String aquariumId;
  final String title;
  final String? description;
  final double amount;
  final ExpenseCategory category;
  final DateTime date;
  final PaymentMethod paymentMethod;
  final String? vendor;
  final String? receiptImagePath;
  final List<String> tags;
  final bool isRecurring;
  final RecurrencePattern? recurrencePattern;
  final String? linkedProductId; // Link to scanned product
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Expense({
    required this.id,
    required this.aquariumId,
    required this.title,
    this.description,
    required this.amount,
    required this.category,
    required this.date,
    required this.paymentMethod,
    this.vendor,
    this.receiptImagePath,
    this.tags = const [],
    this.isRecurring = false,
    this.recurrencePattern,
    this.linkedProductId,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  Expense copyWith({
    String? id,
    String? aquariumId,
    String? title,
    String? description,
    double? amount,
    ExpenseCategory? category,
    DateTime? date,
    PaymentMethod? paymentMethod,
    String? vendor,
    String? receiptImagePath,
    List<String>? tags,
    bool? isRecurring,
    RecurrencePattern? recurrencePattern,
    String? linkedProductId,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Expense(
      id: id ?? this.id,
      aquariumId: aquariumId ?? this.aquariumId,
      title: title ?? this.title,
      description: description ?? this.description,
      amount: amount ?? this.amount,
      category: category ?? this.category,
      date: date ?? this.date,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      vendor: vendor ?? this.vendor,
      receiptImagePath: receiptImagePath ?? this.receiptImagePath,
      tags: tags ?? this.tags,
      isRecurring: isRecurring ?? this.isRecurring,
      recurrencePattern: recurrencePattern ?? this.recurrencePattern,
      linkedProductId: linkedProductId ?? this.linkedProductId,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'title': title,
      'description': description,
      'amount': amount,
      'category': category.name,
      'date': date.toIso8601String(),
      'paymentMethod': paymentMethod.name,
      'vendor': vendor,
      'receiptImagePath': receiptImagePath,
      'tags': tags,
      'isRecurring': isRecurring,
      'recurrencePattern': recurrencePattern?.toJson(),
      'linkedProductId': linkedProductId,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'],
      aquariumId: json['aquariumId'],
      title: json['title'],
      description: json['description'],
      amount: json['amount'].toDouble(),
      category: ExpenseCategory.values.firstWhere(
        (c) => c.name == json['category'],
        orElse: () => ExpenseCategory.other,
      ),
      date: DateTime.parse(json['date']),
      paymentMethod: PaymentMethod.values.firstWhere(
        (p) => p.name == json['paymentMethod'],
        orElse: () => PaymentMethod.cash,
      ),
      vendor: json['vendor'],
      receiptImagePath: json['receiptImagePath'],
      tags: List<String>.from(json['tags'] ?? []),
      isRecurring: json['isRecurring'] ?? false,
      recurrencePattern: json['recurrencePattern'] != null
          ? RecurrencePattern.fromJson(json['recurrencePattern'])
          : null,
      linkedProductId: json['linkedProductId'],
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  @override
  List<Object?> get props => [
        id,
        aquariumId,
        title,
        description,
        amount,
        category,
        date,
        paymentMethod,
        vendor,
        receiptImagePath,
        tags,
        isRecurring,
        recurrencePattern,
        linkedProductId,
        notes,
        createdAt,
        updatedAt,
      ];
}

enum ExpenseCategory {
  equipment('equipment', 'Equipment', Icons.settings, Color(0xFF9E9E9E)),
  food('food', 'Fish Food', Icons.restaurant, Color(0xFFFF9800)),
  medication('medication', 'Medication', Icons.medical_services, Color(0xFFF44336)),
  waterTreatment('water_treatment', 'Water Treatment', Icons.water_drop, Color(0xFF2196F3)),
  electricity('electricity', 'Electricity', Icons.bolt, Color(0xFFFFC107)),
  water('water', 'Water Bills', Icons.water, Color(0xFF00BCD4)),
  maintenance('maintenance', 'Maintenance', Icons.build, Color(0xFF795548)),
  livestock('livestock', 'Fish & Plants', Icons.pets, Color(0xFF4CAF50)),
  decoration('decoration', 'Decoration', Icons.park, Color(0xFF8BC34A)),
  testing('testing', 'Test Kits', Icons.science, Color(0xFF9C27B0)),
  subscription('subscription', 'Subscriptions', Icons.autorenew, Color(0xFF673AB7)),
  professional('professional', 'Professional Services', Icons.person, Color(0xFF3F51B5)),
  other('other', 'Other', Icons.more_horiz, Color(0xFF607D8B));

  final String name;
  final String displayName;
  final IconData icon;
  final Color color;

  const ExpenseCategory(this.name, this.displayName, this.icon, this.color);
}

enum PaymentMethod {
  cash('cash', 'Cash', Icons.money),
  creditCard('credit_card', 'Credit Card', Icons.credit_card),
  debitCard('debit_card', 'Debit Card', Icons.payment),
  bankTransfer('bank_transfer', 'Bank Transfer', Icons.account_balance),
  paypal('paypal', 'PayPal', Icons.account_balance_wallet),
  other('other', 'Other', Icons.payment);

  final String name;
  final String displayName;
  final IconData icon;

  const PaymentMethod(this.name, this.displayName, this.icon);
}

class RecurrencePattern extends Equatable {
  final RecurrenceType type;
  final int interval;
  final DateTime? endDate;
  final int? occurrences;

  const RecurrencePattern({
    required this.type,
    required this.interval,
    this.endDate,
    this.occurrences,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type.name,
      'interval': interval,
      'endDate': endDate?.toIso8601String(),
      'occurrences': occurrences,
    };
  }

  factory RecurrencePattern.fromJson(Map<String, dynamic> json) {
    return RecurrencePattern(
      type: RecurrenceType.values.firstWhere(
        (t) => t.name == json['type'],
      ),
      interval: json['interval'],
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      occurrences: json['occurrences'],
    );
  }

  DateTime? calculateNextDate(DateTime lastDate) {
    switch (type) {
      case RecurrenceType.daily:
        return lastDate.add(Duration(days: interval));
      case RecurrenceType.weekly:
        return lastDate.add(Duration(days: interval * 7));
      case RecurrenceType.monthly:
        return DateTime(
          lastDate.year,
          lastDate.month + interval,
          lastDate.day,
        );
      case RecurrenceType.yearly:
        return DateTime(
          lastDate.year + interval,
          lastDate.month,
          lastDate.day,
        );
    }
  }

  @override
  List<Object?> get props => [type, interval, endDate, occurrences];
}

enum RecurrenceType {
  daily('daily', 'Daily'),
  weekly('weekly', 'Weekly'),
  monthly('monthly', 'Monthly'),
  yearly('yearly', 'Yearly');

  final String name;
  final String displayName;

  const RecurrenceType(this.name, this.displayName);
}

// Budget model for expense tracking
class Budget extends Equatable {
  final String id;
  final String aquariumId;
  final String name;
  final double amount;
  final BudgetPeriod period;
  final DateTime startDate;
  final DateTime? endDate;
  final List<ExpenseCategory> categories;
  final bool isActive;
  final double spent; // Calculated field
  final DateTime createdAt;
  final DateTime updatedAt;

  const Budget({
    required this.id,
    required this.aquariumId,
    required this.name,
    required this.amount,
    required this.period,
    required this.startDate,
    this.endDate,
    this.categories = const [],
    this.isActive = true,
    this.spent = 0.0,
    required this.createdAt,
    required this.updatedAt,
  });

  double get remaining => amount - spent;
  double get percentageUsed => amount > 0 ? (spent / amount * 100) : 0;
  bool get isOverBudget => spent > amount;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aquariumId': aquariumId,
      'name': name,
      'amount': amount,
      'period': period.name,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'categories': categories.map((c) => c.name).toList(),
      'isActive': isActive,
      'spent': spent,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: json['id'],
      aquariumId: json['aquariumId'],
      name: json['name'],
      amount: json['amount'].toDouble(),
      period: BudgetPeriod.values.firstWhere(
        (p) => p.name == json['period'],
      ),
      startDate: DateTime.parse(json['startDate']),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      categories: (json['categories'] as List<dynamic>)
          .map((c) => ExpenseCategory.values.firstWhere(
                (cat) => cat.name == c,
                orElse: () => ExpenseCategory.other,
              ))
          .toList(),
      isActive: json['isActive'] ?? true,
      spent: json['spent']?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  @override
  List<Object?> get props => [
        id,
        aquariumId,
        name,
        amount,
        period,
        startDate,
        endDate,
        categories,
        isActive,
        spent,
        createdAt,
        updatedAt,
      ];
}

enum BudgetPeriod {
  weekly('weekly', 'Weekly'),
  monthly('monthly', 'Monthly'),
  quarterly('quarterly', 'Quarterly'),
  yearly('yearly', 'Yearly');

  final String name;
  final String displayName;

  const BudgetPeriod(this.name, this.displayName);
}

// Statistics model
class ExpenseStatistics {
  final double totalSpent;
  final double averageMonthly;
  final double averageWeekly;
  final Map<ExpenseCategory, double> categoryBreakdown;
  final Map<String, double> monthlyTrend; // Month-Year -> Amount
  final ExpenseCategory topCategory;
  final String topVendor;
  final int totalTransactions;
  final double largestExpense;
  final double smallestExpense;

  const ExpenseStatistics({
    required this.totalSpent,
    required this.averageMonthly,
    required this.averageWeekly,
    required this.categoryBreakdown,
    required this.monthlyTrend,
    required this.topCategory,
    required this.topVendor,
    required this.totalTransactions,
    required this.largestExpense,
    required this.smallestExpense,
  });
}