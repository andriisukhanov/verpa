import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/test_strip_result.dart';
import '../services/test_strip_analyzer.dart';

class WaterTestCameraScreen extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;

  const WaterTestCameraScreen({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
  });

  @override
  State<WaterTestCameraScreen> createState() => _WaterTestCameraScreenState();
}

class _WaterTestCameraScreenState extends State<WaterTestCameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isInitialized = false;
  bool _isProcessing = false;
  bool _showGuide = true;
  TestStripType _selectedStripType = TestStripType.basic5in1;
  File? _capturedImage;
  double _zoomLevel = 1.0;
  bool _flashEnabled = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras!.isNotEmpty) {
        _controller = CameraController(
          _cameras![0],
          ResolutionPreset.high,
          enableAudio: false,
        );
        
        await _controller!.initialize();
        
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      print('Error initializing camera: $e');
    }
  }

  Future<void> _captureImage() async {
    if (!_isInitialized || _controller == null || _isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      final image = await _controller!.takePicture();
      setState(() {
        _capturedImage = File(image.path);
      });
      
      // Show preview dialog
      _showPreviewDialog();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to capture image: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      setState(() {
        _capturedImage = File(image.path);
      });
      _showPreviewDialog();
    }
  }

  void _showPreviewDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Review Image',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                height: 300,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    _capturedImage!,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Is the test strip clearly visible?',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      setState(() {
                        _capturedImage = null;
                      });
                    },
                    child: const Text('Retake'),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _analyzeImage();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                    ),
                    child: const Text('Analyze'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _analyzeImage() async {
    if (_capturedImage == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      final result = await TestStripAnalyzer.analyzeTestStrip(
        imagePath: _capturedImage!.path,
        aquariumId: widget.aquariumId,
        stripType: _selectedStripType,
      );

      if (mounted) {
        context.push(
          '/water-test-results/${widget.aquariumId}',
          extra: result,
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Analysis failed: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Water Test Strip Scanner'),
            Text(
              widget.aquariumName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () {
              setState(() {
                _showGuide = !_showGuide;
              });
            },
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isProcessing,
        child: Stack(
          children: [
            // Camera preview
            if (_isInitialized && _controller != null)
              SizedBox.expand(
                child: CameraPreview(_controller!),
              )
            else
              const Center(
                child: CircularProgressIndicator(
                  color: Colors.white,
                ),
              ),

            // Guide overlay
            if (_showGuide) _buildGuideOverlay(),

            // Bottom controls
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _buildBottomControls(),
            ),

            // Top strip selector
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: _buildStripSelector(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGuideOverlay() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(32),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.info_outline,
                size: 48,
                color: AppTheme.primaryColor,
              ),
              const SizedBox(height: 16),
              const Text(
                'Test Strip Scanning Guide',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildGuideItem(
                Icons.light_mode,
                'Use good lighting',
                'Natural light or bright white light works best',
              ),
              _buildGuideItem(
                Icons.center_focus_strong,
                'Center the strip',
                'Place the entire test strip in frame',
              ),
              _buildGuideItem(
                Icons.square_outlined,
                'Flat surface',
                'Place strip on white background',
              ),
              _buildGuideItem(
                Icons.timer,
                'Timing matters',
                'Scan within recommended time after dipping',
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _showGuide = false;
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                ),
                child: const Text('Got it'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGuideItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primaryColor),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStripSelector() {
    return Container(
      color: Colors.black87,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Text(
            'Strip Type:',
            style: TextStyle(color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: DropdownButton<TestStripType>(
              value: _selectedStripType,
              dropdownColor: Colors.black87,
              style: const TextStyle(color: Colors.white),
              isExpanded: true,
              items: TestStripType.values
                  .where((type) => type != TestStripType.custom)
                  .map((type) => DropdownMenuItem(
                        value: type,
                        child: Text(type.displayName),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedStripType = value;
                  });
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      color: Colors.black87,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Zoom controls
          if (_isInitialized && _controller != null) ...[
            Row(
              children: [
                const Icon(Icons.zoom_out, color: Colors.white),
                Expanded(
                  child: Slider(
                    value: _zoomLevel,
                    min: 1.0,
                    max: 5.0,
                    activeColor: AppTheme.primaryColor,
                    inactiveColor: Colors.white30,
                    onChanged: (value) async {
                      setState(() {
                        _zoomLevel = value;
                      });
                      await _controller!.setZoomLevel(value);
                    },
                  ),
                ),
                const Icon(Icons.zoom_in, color: Colors.white),
              ],
            ),
            const SizedBox(height: 16),
          ],
          
          // Action buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Gallery button
              _buildControlButton(
                icon: Icons.photo_library,
                onPressed: _pickFromGallery,
              ),
              
              // Capture button
              _buildCaptureButton(),
              
              // Flash toggle
              _buildControlButton(
                icon: _flashEnabled ? Icons.flash_on : Icons.flash_off,
                onPressed: _isInitialized
                    ? () async {
                        setState(() {
                          _flashEnabled = !_flashEnabled;
                        });
                        await _controller!.setFlashMode(
                          _flashEnabled ? FlashMode.torch : FlashMode.off,
                        );
                      }
                    : null,
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // History button
          TextButton.icon(
            onPressed: () {
              context.push('/water-test-history/${widget.aquariumId}');
            },
            icon: const Icon(Icons.history, color: Colors.white),
            label: const Text(
              'View Test History',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    VoidCallback? onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white30),
      ),
      child: IconButton(
        icon: Icon(icon),
        color: Colors.white,
        iconSize: 28,
        onPressed: onPressed,
        disabledColor: Colors.white30,
      ),
    );
  }

  Widget _buildCaptureButton() {
    return GestureDetector(
      onTap: _isInitialized && !_isProcessing ? _captureImage : null,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _isInitialized && !_isProcessing
              ? AppTheme.primaryColor
              : Colors.grey,
          border: Border.all(
            color: Colors.white,
            width: 4,
          ),
        ),
        child: _isProcessing
            ? const Center(
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 3,
                ),
              )
            : const Icon(
                Icons.camera,
                color: Colors.white,
                size: 36,
              ),
      ),
    );
  }
}