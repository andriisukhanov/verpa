# TensorFlow Lite Models

This directory contains TensorFlow Lite models for water parameter predictions.

## water_prediction.tflite

This model predicts future water parameter values based on historical data.

### Input
- 10 consecutive historical readings (normalized values)

### Output
- [predicted_value, min_value, max_value]

### Training
The model should be trained on historical water parameter data from multiple aquariums to learn patterns and trends.

## Adding Models

1. Train your model using TensorFlow/Keras
2. Convert to TensorFlow Lite format
3. Place the .tflite file in this directory
4. Update the model path in prediction_service.dart