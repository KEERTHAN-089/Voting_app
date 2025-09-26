# Image Classification Model with Memory Optimization

This directory contains a memory-optimized Xception-based image classification model that addresses the following issues:

- ✅ **FailedPreconditionError** handling
- ✅ **DNN library initialization failed** error resolution  
- ✅ **Memory constraints** optimization
- ✅ **Mixed precision training** for reduced memory usage
- ✅ **Progressive fallback strategies** for reliability

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Test the Implementation

```bash
python test_model.py
```

This will run comprehensive tests to verify all optimizations are working.

### 3. Train the Model

```bash
python train_model.py
```

## 📁 Files Overview

| File | Description |
|------|-------------|
| `image_classification_model.py` | Main model class with memory optimizations |
| `model_config.py` | Configuration management and error solutions |
| `train_model.py` | Training script with comprehensive error handling |
| `memory_utils.py` | Memory management and monitoring utilities |
| `test_model.py` | Test suite to verify all features |
| `requirements.txt` | Python dependencies |

## 🔧 Key Features

### Memory Optimizations

1. **Reduced Batch Size**: Default reduced from 4 to 2 (can go down to 1)
2. **Mixed Precision Training**: Uses float16 for forward pass, float32 for gradients
3. **GPU Memory Growth**: Prevents TensorFlow from allocating all GPU memory at once
4. **Layer Freezing**: Only fine-tunes last 20 layers of Xception base model
5. **Memory Monitoring**: Real-time tracking of memory usage during training

### Error Handling

1. **FailedPreconditionError**: Automatic session clearing and model complexity reduction
2. **DNN Library Initialization**: Progressive fallback strategies including CPU-only mode
3. **ResourceExhaustedError**: Automatic batch size and memory limit reduction
4. **Progressive Retries**: Up to 3 attempts with increasingly conservative settings

### Fallback Strategies

When errors occur, the system automatically tries:

1. **Strategy 1**: Reduce batch size to 1 and halve memory limit
2. **Strategy 2**: Switch to CPU-only mode with conservative settings  
3. **Strategy 3**: Use minimal configuration (150x150 input, batch_size=1)

## ⚙️ Configuration Options

### Default Configuration
```python
config = ModelConfig()
# batch_size=2, input_shape=(299,299,3), mixed_precision=True
```

### Memory-Constrained Configuration  
```python
config = ModelConfig.create_memory_constrained_config()
# batch_size=1, input_shape=(224,224,3), memory_limit=1024MB
```

### Development Configuration
```python
config = ModelConfig.create_development_config()
# batch_size=4, input_shape=(150,150,3), epochs=2 (for quick testing)
```

## 🧠 Architecture Details

The model uses a modified Xception architecture:

- **Base Model**: Xception pre-trained on ImageNet (frozen except last 20 layers)
- **Custom Head**: 
  - Dense(128) → Dropout(0.3) → Dense(64) → Dropout(0.2) → Dense(num_classes)
- **Optimization**: Mixed precision training with automatic loss scaling
- **Memory**: Average pooling instead of flattening to reduce parameters

## 📊 Memory Usage Monitoring

The system provides detailed memory monitoring:

```python
# Memory usage is logged throughout training
Memory before model creation: 245.32 MB
Memory after model creation: 1,234.56 MB  
Memory increase: 989.24 MB

# Real-time monitoring during training
Epoch 1 - Memory usage: 1,456.78 MB (67.3%)
WARNING: High memory usage detected (87.2%)
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

**1. DNN library initialization failed**
- Automatically switches to CPU-only mode
- Reduces memory limits
- Uses minimal configuration

**2. Out of memory errors**  
- Batch size automatically reduced to 1
- Input image size reduced to 224x224 or 150x150
- Memory limit halved

**3. FailedPreconditionError**
- TensorFlow session automatically cleared
- Model complexity reduced (smaller dense layers)
- Progressive retry with simpler configurations

### Manual Solutions

If automatic fallbacks fail:

```python
# Force CPU-only mode
import os
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

# Use minimal configuration
config = ModelConfig.create_memory_constrained_config()
config.batch_size = 1
config.input_shape = (150, 150, 3)
```

## 📈 Training Example

```python
from train_model import TrainingManager
from model_config import ModelConfig

# Create configuration
config = ModelConfig.create_memory_constrained_config()

# Create training manager
manager = TrainingManager(config)

# Train with automatic error handling
history = manager.train_model(use_sample_data=True)
```

## 🔍 Testing

Run the test suite to verify everything is working:

```bash
python test_model.py
```

Expected output:
```
✅ Memory management tests passed
✅ Configuration tests passed  
✅ TensorFlow setup tests passed
✅ Error handling tests passed
✅ Model creation tests passed

🎉 ALL TESTS PASSED!
```

## 📋 System Requirements

**Minimum Requirements:**
- Python 3.8+
- 2GB RAM available
- TensorFlow 2.12+

**Recommended:**
- Python 3.9+  
- 4GB+ RAM
- GPU with 2GB+ VRAM (optional)
- CUDA 11.8+ (for GPU support)

## 🏗️ Integration

To integrate with the existing voting app:

```python
# Add to backend routes for image classification
from image_classification_model import MemoryOptimizedXceptionModel
from model_config import ModelConfig

# Initialize model
config = ModelConfig.create_memory_constrained_config()
classifier = MemoryOptimizedXceptionModel(**config.to_dict())
model = classifier.create_model()
classifier.compile_model()

# Use for image classification in voting app
def classify_candidate_image(image_path):
    # Preprocess image
    # Run prediction
    # Return classification results
    pass
```

## 📝 Logging

All operations are logged to:
- Console output (INFO level)
- `training.log` file (detailed logs)

## 🤝 Contributing

When modifying the model:

1. Test with `test_model.py` first
2. Ensure memory optimizations are preserved
3. Update configuration options as needed
4. Add appropriate error handling

## 📄 License

Same as parent project (ISC)