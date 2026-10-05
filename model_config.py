#!/usr/bin/env python3
"""
Configuration file for image classification model
Contains all configurable parameters and memory optimization settings
"""

import os
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any

@dataclass
class ModelConfig:
    """Configuration class for the image classification model"""
    
    # Model Architecture
    input_shape: Tuple[int, int, int] = (299, 299, 3)
    num_classes: int = 2
    base_model_name: str = "xception"
    
    # Memory Optimization Settings
    batch_size: int = 2  # Reduced from default 4 for memory constraints
    mixed_precision: bool = True
    memory_limit_mb: int = 2048
    freeze_base_layers: int = -20  # Freeze all but last 20 layers
    
    # Training Parameters
    epochs: int = 10
    learning_rate: float = 0.0001
    validation_split: float = 0.2
    
    # Data Augmentation (reduced for memory efficiency)
    rotation_range: float = 20
    width_shift_range: float = 0.1
    height_shift_range: float = 0.1
    horizontal_flip: bool = True
    
    # Regularization
    dropout_rate_1: float = 0.3
    dropout_rate_2: float = 0.2
    dense_units_1: int = 128
    dense_units_2: int = 64
    
    # Callbacks
    early_stopping_patience: int = 5
    reduce_lr_patience: int = 3
    reduce_lr_factor: float = 0.5
    min_learning_rate: float = 1e-7
    
    # File paths
    model_save_path: str = "best_xception_model.h5"
    logs_dir: str = "logs"
    
    # TensorFlow Configuration
    tf_inter_op_threads: int = 2
    tf_intra_op_threads: int = 2
    
    # Error Handling
    max_retries: int = 3
    retry_delay: float = 1.0
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        if self.batch_size < 1:
            raise ValueError("Batch size must be at least 1")
        
        if self.memory_limit_mb < 512:
            raise ValueError("Memory limit must be at least 512 MB")
        
        if self.learning_rate <= 0:
            raise ValueError("Learning rate must be positive")
        
        if not (0 < self.validation_split < 1):
            raise ValueError("Validation split must be between 0 and 1")
    
    @classmethod
    def create_memory_constrained_config(cls) -> 'ModelConfig':
        """Create a configuration optimized for very limited memory"""
        return cls(
            input_shape=(224, 224, 3),  # Smaller input size
            batch_size=1,  # Minimum batch size
            mixed_precision=True,
            memory_limit_mb=1024,  # 1GB limit
            dense_units_1=64,  # Smaller dense layers
            dense_units_2=32,
            freeze_base_layers=-10,  # Freeze more layers
            epochs=5  # Fewer epochs for quick testing
        )
    
    @classmethod
    def create_development_config(cls) -> 'ModelConfig':
        """Create a configuration for development/testing"""
        return cls(
            input_shape=(150, 150, 3),  # Much smaller for quick testing
            batch_size=4,
            epochs=2,
            dense_units_1=32,
            dense_units_2=16
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            'input_shape': self.input_shape,
            'num_classes': self.num_classes,
            'batch_size': self.batch_size,
            'mixed_precision': self.mixed_precision,
            'memory_limit_mb': self.memory_limit_mb,
            'learning_rate': self.learning_rate,
            'epochs': self.epochs
        }
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return f"""ModelConfig:
  Input Shape: {self.input_shape}
  Batch Size: {self.batch_size}
  Mixed Precision: {self.mixed_precision}
  Memory Limit: {self.memory_limit_mb} MB
  Learning Rate: {self.learning_rate}
  Epochs: {self.epochs}
  Dense Units: [{self.dense_units_1}, {self.dense_units_2}]
"""


# Environment Variables for TensorFlow Optimization
TF_ENV_VARS = {
    'TF_CPP_MIN_LOG_LEVEL': '2',  # Suppress INFO and WARNING logs
    'TF_FORCE_GPU_ALLOW_GROWTH': 'true',
    'TF_GPU_THREAD_MODE': 'gpu_private',
    'TF_GPU_THREAD_COUNT': '2',
    'CUDA_VISIBLE_DEVICES': '0',  # Use only first GPU if available
}

def set_tensorflow_env():
    """Set environment variables for TensorFlow optimization"""
    for key, value in TF_ENV_VARS.items():
        os.environ[key] = value


# Memory thresholds for different actions
MEMORY_THRESHOLDS = {
    'warning': 80,  # Warn when memory usage exceeds 80%
    'critical': 90,  # Take action when memory usage exceeds 90%
    'emergency': 95   # Emergency cleanup when memory usage exceeds 95%
}

# Error messages for common issues
ERROR_MESSAGES = {
    'dnn_init_failed': """
    DNN library initialization failed. This usually indicates:
    1. Insufficient GPU memory
    2. CUDA/cuDNN version mismatch
    3. GPU driver issues
    
    Solutions:
    - Reduce batch_size further (try batch_size=1)
    - Reduce memory_limit_mb
    - Disable GPU and use CPU only
    - Update GPU drivers and CUDA/cuDNN
    """,
    
    'failed_precondition': """
    FailedPreconditionError occurred. This can be caused by:
    1. Memory constraints
    2. Incompatible tensor operations
    3. Model compilation issues
    
    Solutions:
    - Clear TensorFlow session and restart
    - Reduce model complexity
    - Check input data format
    """,
    
    'resource_exhausted': """
    Out of memory error. Try these solutions:
    1. Reduce batch_size (current: {})
    2. Reduce memory_limit_mb (current: {} MB)
    3. Use smaller input_shape
    4. Enable mixed_precision training
    5. Freeze more base model layers
    """,
}

def get_error_solution(error_type: str, config: ModelConfig) -> str:
    """Get solution message for specific error type"""
    if error_type == 'resource_exhausted':
        return ERROR_MESSAGES[error_type].format(config.batch_size, config.memory_limit_mb)
    return ERROR_MESSAGES.get(error_type, "Unknown error occurred")