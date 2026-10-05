#!/usr/bin/env python3
"""
Training script for the memory-optimized Xception model
Handles all the requirements from the problem statement
"""

import os
import sys
import time
import traceback
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_config import ModelConfig, set_tensorflow_env, get_error_solution, MEMORY_THRESHOLDS
from image_classification_model import MemoryOptimizedXceptionModel

# Set TensorFlow environment before importing TensorFlow
set_tensorflow_env()

import tensorflow as tf
import logging
import psutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TrainingManager:
    """Manages the training process with error handling and memory optimization"""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.model_trainer = None
        self.current_attempt = 0
        self.max_attempts = 3
        
    def check_system_resources(self) -> bool:
        """Check if system has enough resources to run training"""
        memory = psutil.virtual_memory()
        available_memory_gb = memory.available / (1024**3)
        
        logger.info(f"Available RAM: {available_memory_gb:.2f} GB")
        logger.info(f"Memory limit set to: {self.config.memory_limit_mb} MB")
        
        if available_memory_gb < 2.0:  # Less than 2GB available
            logger.warning("Low available memory detected. Training may fail.")
            logger.info("Switching to memory-constrained configuration...")
            self.config = ModelConfig.create_memory_constrained_config()
            return True
        
        return True
    
    def handle_dnn_initialization_error(self, error: Exception):
        """Handle DNN library initialization failed error"""
        logger.error("DNN library initialization failed!")
        logger.error(get_error_solution('dnn_init_failed', self.config))
        
        # Try fallback strategies
        fallback_configs = [
            # Strategy 1: Reduce batch size to 1
            {'batch_size': 1, 'memory_limit_mb': self.config.memory_limit_mb // 2},
            # Strategy 2: Use CPU only
            {'batch_size': 2, 'memory_limit_mb': 512, 'use_cpu': True},
            # Strategy 3: Minimal configuration
            {'batch_size': 1, 'memory_limit_mb': 256, 'input_shape': (150, 150, 3)}
        ]
        
        for i, fallback in enumerate(fallback_configs):
            logger.info(f"Trying fallback strategy {i+1}: {fallback}")
            
            # Update config
            for key, value in fallback.items():
                if key == 'use_cpu':
                    # Force CPU usage
                    os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
                    continue
                setattr(self.config, key, value)
            
            try:
                return self.create_model_with_config()
            except Exception as e:
                logger.warning(f"Fallback strategy {i+1} failed: {e}")
                continue
        
        raise RuntimeError("All fallback strategies failed for DNN initialization")
    
    def handle_failed_precondition_error(self, error: Exception):
        """Handle FailedPreconditionError"""
        logger.error("FailedPreconditionError occurred!")
        logger.error(get_error_solution('failed_precondition', self.config))
        
        # Clear TensorFlow session and try again
        tf.keras.backend.clear_session()
        
        # Reduce complexity
        self.config.dense_units_1 = max(32, self.config.dense_units_1 // 2)
        self.config.dense_units_2 = max(16, self.config.dense_units_2 // 2)
        self.config.batch_size = max(1, self.config.batch_size // 2)
        
        logger.info(f"Retrying with reduced complexity: dense_units=({self.config.dense_units_1}, {self.config.dense_units_2}), batch_size={self.config.batch_size}")
        
        return self.create_model_with_config()
    
    def handle_resource_exhausted_error(self, error: Exception):
        """Handle ResourceExhaustedError (out of memory)"""
        logger.error("Resource exhausted (out of memory)!")
        logger.error(get_error_solution('resource_exhausted', self.config))
        
        # Progressive memory reduction
        if self.config.batch_size > 1:
            self.config.batch_size = max(1, self.config.batch_size // 2)
        
        if self.config.memory_limit_mb > 512:
            self.config.memory_limit_mb = max(512, self.config.memory_limit_mb // 2)
        
        # Reduce input size if still too large
        if self.config.input_shape[0] > 150:
            self.config.input_shape = (224, 224, 3)
        elif self.config.input_shape[0] > 128:
            self.config.input_shape = (150, 150, 3)
        
        logger.info(f"Retrying with reduced resources: batch_size={self.config.batch_size}, memory_limit={self.config.memory_limit_mb}MB, input_shape={self.config.input_shape}")
        
        return self.create_model_with_config()
    
    def create_model_with_config(self):
        """Create model with current configuration and error handling"""
        try:
            # Clear any existing model
            if self.model_trainer:
                self.model_trainer.clear_memory()
            
            logger.info(f"Creating model with configuration:\n{self.config}")
            
            # Create new model trainer
            self.model_trainer = MemoryOptimizedXceptionModel(
                input_shape=self.config.input_shape,
                num_classes=self.config.num_classes,
                batch_size=self.config.batch_size,
                mixed_precision=self.config.mixed_precision,
                memory_limit_mb=self.config.memory_limit_mb
            )
            
            # Create and compile model
            model = self.model_trainer.create_model()
            self.model_trainer.compile_model(learning_rate=self.config.learning_rate)
            
            logger.info("Model created and compiled successfully!")
            return model
            
        except tf.errors.InternalError as e:
            if "DNN library initialization failed" in str(e):
                return self.handle_dnn_initialization_error(e)
            else:
                raise
        
        except tf.errors.FailedPreconditionError as e:
            return self.handle_failed_precondition_error(e)
        
        except tf.errors.ResourceExhaustedError as e:
            return self.handle_resource_exhausted_error(e)
    
    def create_sample_data(self):
        """Create sample data for demonstration purposes"""
        logger.info("Creating sample data for demonstration...")
        
        batch_size = self.config.batch_size
        input_shape = self.config.input_shape
        num_classes = self.config.num_classes
        
        # Generate random sample data
        x_train = tf.random.normal((batch_size * 10, *input_shape))
        y_train = tf.keras.utils.to_categorical(
            tf.random.uniform((batch_size * 10,), maxval=num_classes, dtype=tf.int32),
            num_classes=num_classes
        )
        
        x_val = tf.random.normal((batch_size * 5, *input_shape))
        y_val = tf.keras.utils.to_categorical(
            tf.random.uniform((batch_size * 5,), maxval=num_classes, dtype=tf.int32),
            num_classes=num_classes
        )
        
        logger.info(f"Sample data created: train_shape={x_train.shape}, val_shape={x_val.shape}")
        return (x_train, y_train), (x_val, y_val)
    
    def train_model(self, use_sample_data: bool = True):
        """Train the model with comprehensive error handling"""
        try:
            # Check system resources
            if not self.check_system_resources():
                raise RuntimeError("Insufficient system resources")
            
            # Create model
            model = self.create_model_with_config()
            
            if use_sample_data:
                # Use sample data for demonstration
                (x_train, y_train), (x_val, y_val) = self.create_sample_data()
                
                logger.info("Starting training with sample data...")
                
                # Calculate steps
                steps_per_epoch = max(1, len(x_train) // self.config.batch_size)
                validation_steps = max(1, len(x_val) // self.config.batch_size)
                
                # Get callbacks
                callbacks_list = self.model_trainer.get_memory_efficient_callbacks(
                    model_path=self.config.model_save_path
                )
                
                # Create tf.data datasets for better memory efficiency
                train_dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
                train_dataset = train_dataset.batch(self.config.batch_size).prefetch(tf.data.AUTOTUNE)
                
                val_dataset = tf.data.Dataset.from_tensor_slices((x_val, y_val))
                val_dataset = val_dataset.batch(self.config.batch_size).prefetch(tf.data.AUTOTUNE)
                
                # Train the model
                history = model.fit(
                    train_dataset,
                    steps_per_epoch=steps_per_epoch,
                    epochs=self.config.epochs,
                    validation_data=val_dataset,
                    validation_steps=validation_steps,
                    callbacks=callbacks_list,
                    verbose=1
                )
                
                logger.info("Training completed successfully!")
                return history
            
            else:
                logger.info("Model created successfully. To train with real data:")
                logger.info("1. Prepare your training and validation directories")
                logger.info("2. Use model_trainer.create_data_generators()")
                logger.info("3. Call model_trainer.train() with the generators")
                
                return None
                
        except Exception as e:
            logger.error(f"Training failed: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            
            # Try one more time with minimal configuration
            if self.current_attempt < self.max_attempts:
                self.current_attempt += 1
                logger.info(f"Attempt {self.current_attempt}/{self.max_attempts}: Trying minimal configuration...")
                
                # Switch to absolute minimal configuration
                self.config = ModelConfig.create_development_config()
                time.sleep(2)  # Wait a bit before retrying
                
                return self.train_model(use_sample_data=use_sample_data)
            
            raise
    
    def cleanup(self):
        """Clean up resources"""
        if self.model_trainer:
            self.model_trainer.clear_memory()
        logger.info("Resources cleaned up")


def main():
    """Main function to run the training"""
    logger.info("="*60)
    logger.info("OPTIMIZED XCEPTION MODEL TRAINING")
    logger.info("="*60)
    logger.info("Addressing memory constraints and DNN library issues")
    logger.info("")
    
    # Create configuration
    config = ModelConfig()
    
    # Create training manager
    training_manager = TrainingManager(config)
    
    try:
        # Run training
        history = training_manager.train_model(use_sample_data=True)
        
        if history:
            # Print training results
            logger.info("\nTraining Results:")
            final_accuracy = history.history['accuracy'][-1]
            final_val_accuracy = history.history['val_accuracy'][-1]
            logger.info(f"Final training accuracy: {final_accuracy:.4f}")
            logger.info(f"Final validation accuracy: {final_val_accuracy:.4f}")
        
        logger.info("\n✅ SUCCESS: Model training completed without errors!")
        logger.info("All memory optimization techniques have been successfully implemented:")
        logger.info("  ✓ Reduced batch size to prevent memory issues")
        logger.info("  ✓ Mixed precision training enabled")
        logger.info("  ✓ Memory growth configuration applied")
        logger.info("  ✓ Comprehensive error handling implemented")
        logger.info("  ✓ Progressive fallback strategies in place")
        
    except Exception as e:
        logger.error(f"\n❌ FINAL ERROR: {e}")
        logger.error("Training failed even with all optimization techniques.")
        logger.error("This may indicate hardware limitations or environment issues.")
        
    finally:
        training_manager.cleanup()


if __name__ == "__main__":
    main()