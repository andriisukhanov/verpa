import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../models/expense.dart';
import '../services/expense_service.dart';

class AddExpenseScreen extends StatefulWidget {
  final String aquariumId;
  final Expense? expense;

  const AddExpenseScreen({
    super.key,
    required this.aquariumId,
    this.expense,
  });

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _amountController = TextEditingController();
  final _vendorController = TextEditingController();
  final _notesController = TextEditingController();
  final _tagsController = TextEditingController();
  
  ExpenseCategory _selectedCategory = ExpenseCategory.other;
  PaymentMethod _selectedPaymentMethod = PaymentMethod.cash;
  DateTime _selectedDate = DateTime.now();
  File? _receiptImage;
  bool _isRecurring = false;
  RecurrenceType _recurrenceType = RecurrenceType.monthly;
  int _recurrenceInterval = 1;
  DateTime? _recurrenceEndDate;
  bool _isLoading = false;

  static final _uuid = const Uuid();

  @override
  void initState() {
    super.initState();
    if (widget.expense != null) {
      _populateFromExpense(widget.expense!);
    }
  }

  void _populateFromExpense(Expense expense) {
    _titleController.text = expense.title;
    _amountController.text = expense.amount.toStringAsFixed(2);
    _vendorController.text = expense.vendor ?? '';
    _notesController.text = expense.notes ?? '';
    _tagsController.text = expense.tags.join(', ');
    _selectedCategory = expense.category;
    _selectedPaymentMethod = expense.paymentMethod;
    _selectedDate = expense.date;
    _isRecurring = expense.isRecurring;
    
    if (expense.recurrencePattern != null) {
      _recurrenceType = expense.recurrencePattern!.type;
      _recurrenceInterval = expense.recurrencePattern!.interval;
      _recurrenceEndDate = expense.recurrencePattern!.endDate;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _vendorController.dispose();
    _notesController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    
    if (date != null) {
      setState(() {
        _selectedDate = date;
      });
    }
  }

  Future<void> _selectRecurrenceEndDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _recurrenceEndDate ?? DateTime.now().add(const Duration(days: 365)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 1825)), // 5 years
    );
    
    if (date != null) {
      setState(() {
        _recurrenceEndDate = date;
      });
    }
  }

  Future<void> _pickReceipt() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    
    if (image != null) {
      setState(() {
        _receiptImage = File(image.path);
      });
    }
  }

  Future<void> _saveExpense() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final tags = _tagsController.text.isNotEmpty
          ? _tagsController.text.split(',').map((t) => t.trim()).toList()
          : <String>[];
      
      final expense = Expense(
        id: widget.expense?.id ?? _uuid.v4(),
        aquariumId: widget.aquariumId,
        title: _titleController.text,
        amount: double.parse(_amountController.text),
        category: _selectedCategory,
        date: _selectedDate,
        paymentMethod: _selectedPaymentMethod,
        vendor: _vendorController.text.isEmpty ? null : _vendorController.text,
        receiptImagePath: _receiptImage?.path ?? widget.expense?.receiptImagePath,
        tags: tags,
        isRecurring: _isRecurring,
        recurrencePattern: _isRecurring
            ? RecurrencePattern(
                type: _recurrenceType,
                interval: _recurrenceInterval,
                endDate: _recurrenceEndDate,
              )
            : null,
        notes: _notesController.text.isEmpty ? null : _notesController.text,
        createdAt: widget.expense?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      await ExpenseService.saveExpense(expense);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.expense != null ? 'Expense updated' : 'Expense added'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.expense != null ? 'Edit Expense' : 'Add Expense'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Basic Info Section
              Text(
                'Expense Details',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // Title
              CustomTextField(
                label: 'Title',
                controller: _titleController,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a title';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Amount and Category
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'Amount',
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.attach_money,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Required';
                        }
                        if (double.tryParse(value) == null) {
                          return 'Invalid';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Category',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.greyColor),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<ExpenseCategory>(
                              value: _selectedCategory,
                              isExpanded: true,
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _selectedCategory = value;
                                  });
                                }
                              },
                              items: ExpenseCategory.values.map((category) {
                                return DropdownMenuItem(
                                  value: category,
                                  child: Row(
                                    children: [
                                      Icon(
                                        category.icon,
                                        size: 20,
                                        color: category.color,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          category.displayName,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Date and Payment Method
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'Date',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          suffixIcon: const Icon(Icons.calendar_today),
                        ),
                        child: Text(
                          DateFormat('MMM d, yyyy').format(_selectedDate),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Payment Method',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.greyColor),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<PaymentMethod>(
                              value: _selectedPaymentMethod,
                              isExpanded: true,
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _selectedPaymentMethod = value;
                                  });
                                }
                              },
                              items: PaymentMethod.values.map((method) {
                                return DropdownMenuItem(
                                  value: method,
                                  child: Row(
                                    children: [
                                      Icon(
                                        method.icon,
                                        size: 20,
                                        color: AppTheme.textSecondary,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(method.displayName),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Vendor
              CustomTextField(
                label: 'Vendor/Store (Optional)',
                controller: _vendorController,
                prefixIcon: Icons.store,
              ),
              
              const SizedBox(height: 24),
              
              // Recurring Expense Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recurring Expense',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Switch(
                    value: _isRecurring,
                    onChanged: (value) {
                      setState(() {
                        _isRecurring = value;
                      });
                    },
                    activeColor: AppTheme.primaryColor,
                  ),
                ],
              ),
              
              if (_isRecurring) ...[
                const SizedBox(height: 16),
                
                // Recurrence Pattern
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Repeat Every',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              SizedBox(
                                width: 60,
                                child: CustomTextField(
                                  initialValue: _recurrenceInterval.toString(),
                                  keyboardType: TextInputType.number,
                                  onChanged: (value) {
                                    final interval = int.tryParse(value);
                                    if (interval != null && interval > 0) {
                                      setState(() {
                                        _recurrenceInterval = interval;
                                      });
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: AppTheme.greyColor),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<RecurrenceType>(
                                      value: _recurrenceType,
                                      isExpanded: true,
                                      onChanged: (value) {
                                        if (value != null) {
                                          setState(() {
                                            _recurrenceType = value;
                                          });
                                        }
                                      },
                                      items: RecurrenceType.values.map((type) {
                                        return DropdownMenuItem(
                                          value: type,
                                          child: Text(type.displayName),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: InkWell(
                        onTap: _selectRecurrenceEndDate,
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: 'End Date',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            suffixIcon: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (_recurrenceEndDate != null)
                                  IconButton(
                                    icon: const Icon(Icons.clear),
                                    onPressed: () {
                                      setState(() {
                                        _recurrenceEndDate = null;
                                      });
                                    },
                                  ),
                                const Icon(Icons.calendar_today),
                              ],
                            ),
                          ),
                          child: Text(
                            _recurrenceEndDate != null
                                ? DateFormat('MMM d, yyyy').format(_recurrenceEndDate!)
                                : 'No end date',
                            style: TextStyle(
                              color: _recurrenceEndDate != null
                                  ? null
                                  : AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              
              const SizedBox(height: 24),
              
              // Additional Info Section
              Text(
                'Additional Information',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              // Tags
              CustomTextField(
                label: 'Tags (comma separated)',
                controller: _tagsController,
                prefixIcon: Icons.label,
              ),
              
              const SizedBox(height: 16),
              
              // Notes
              CustomTextField(
                label: 'Notes (Optional)',
                controller: _notesController,
                maxLines: 3,
              ),
              
              const SizedBox(height: 16),
              
              // Receipt Image
              Text(
                'Receipt',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              
              if (_receiptImage != null || widget.expense?.receiptImagePath != null)
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        _receiptImage ?? File(widget.expense!.receiptImagePath!),
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: CircleAvatar(
                        backgroundColor: Colors.black54,
                        child: IconButton(
                          icon: const Icon(Icons.close, color: Colors.white),
                          onPressed: () {
                            setState(() {
                              _receiptImage = null;
                            });
                          },
                        ),
                      ),
                    ),
                  ],
                )
              else
                InkWell(
                  onTap: _pickReceipt,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    height: 100,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: AppTheme.greyColor,
                        style: BorderStyle.solid,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.camera_alt,
                          color: AppTheme.greyColor,
                          size: 32,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Take Photo of Receipt',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              
              const SizedBox(height: 32),
              
              // Save Button
              CustomButton(
                text: widget.expense != null ? 'Update Expense' : 'Save Expense',
                icon: Icons.save,
                onPressed: _isLoading ? null : _saveExpense,
                isLoading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }
}