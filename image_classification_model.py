#!/usr/bin/env python3
"""
Optimized Image Classification Model with Xception Architecture
Addresses memory constraints and DNN library initialization issues
"""

import os
import gc
import logging
import warnings
from typing import Optional, Tuple, Dict, Any
from pathlib import Path

# Suppress tensorflow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore')

import tensorflow as tf
import numpy as np
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import Xception
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
import psutil
import memory_profiler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MemoryOptimizedXceptionModel:
    """
    Memory-optimized Xception model for image classification
    Implements various techniques to reduce memory usage and prevent DNN errors
    """
    
    def __init__(
        self,
        input_shape: Tuple[int, int, int] = (299, 299, 3),
        num_classes: int = 2,
        batch_size: int = 2,  # Reduced from default 4
        mixed_precision: bool = True,
        memory_limit_mb: int = 2048
    ):
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.batch_size = batch_size
        self.mixed_precision = mixed_precision
        self.memory_limit_mb = memory_limit_mb
        self.model = None
        
        # Initialize TensorFlow optimizations
        self._setup_tensorflow()
        
        if mixed_precision:
            self._enable_mixed_precision()
    
    def _setup_tensorflow(self):
        """Configure TensorFlow for optimal memory usage"""
        try:
            # Configure GPU memory growth to prevent allocation errors
            gpus = tf.config.experimental.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                    # Set memory limit to prevent OOM
                    tf.config.experimental.set_limit(
                        gpu, self.memory_limit_mb
                    )
                logger.info(f"Configured {len(gpus)} GPU(s) with memory growth")
            else:
                logger.info("No GPUs found, using CPU")
                
            # Configure CPU settings for better performance
            tf.config.threading.set_inter_op_parallelism_threads(2)
            tf.config.threading.set_intra_op_parallelism_threads(2)
            
        except Exception as e:
            logger.error(f"Error setting up TensorFlow: {e}")
            raise RuntimeError(f"TensorFlow setup failed: {e}")
    
    def _enable_mixed_precision(self):
        """Enable mixed precision training for memory optimization"""
        try:
            policy = tf.keras.mixed_precision.Policy('mixed_float16')
            tf.keras.mixed_precision.set_global_policy(policy)
            logger.info("Mixed precision training enabled")
        except Exception as e:
            logger.warning(f"Could not enable mixed precision: {e}")
            self.mixed_precision = False
    
    def _monitor_memory_usage(self) -> Dict[str, float]:
        """Monitor current memory usage"""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        return {
            'ram_usage_mb': memory_info.rss / 1024 / 1024,
            'ram_usage_percent': process.memory_percent(),
            'available_ram_mb': psutil.virtual_memory().available / 1024 / 1024
        }
    
    def create_model(self) -> Model:
        """
        Create memory-optimized Xception model with error handling
        """
        try:
            logger.info("Creating Xception model with memory optimizations...")
            
            # Monitor memory before model creation
            memory_before = self._monitor_memory_usage()
            logger.info(f"Memory before model creation: {memory_before['ram_usage_mb']:.2f} MB")
            
            # Create base Xception model with reduced complexity
            base_model = Xception(
                weights='imagenet',
                include_top=False,
                input_shape=self.input_shape,
                pooling='avg'  # Use average pooling to reduce parameters
            )
            
            # Freeze most of the base model layers for memory efficiency
            # Only fine-tune the last few layers
            for layer in base_model.layers[:-20]:  # Freeze all but last 20 layers
                layer.trainable = False
            
            # Create custom top layers with dropout for regularization
            inputs = base_model.input
            x = base_model.output
            
            # Add memory-efficient dense layers
            x = layers.Dense(128, activation='relu', name='feature_dense')(x)
            x = layers.Dropout(0.3, name='dropout_1')(x)
            x = layers.Dense(64, activation='relu', name='classification_dense')(x)
            x = layers.Dropout(0.2, name='dropout_2')(x)
            
            # Output layer
            if self.mixed_precision:
                # Use float32 for final layer in mixed precision mode
                outputs = layers.Dense(
                    self.num_classes, 
                    activation='softmax',
                    dtype='float32',
                    name='predictions'
                )(x)
            else:
                outputs = layers.Dense(
                    self.num_classes, 
                    activation='softmax',
                    name='predictions'
                )(x)
            
            model = Model(inputs, outputs, name='optimized_xception')
            
            # Monitor memory after model creation
            memory_after = self._monitor_memory_usage()
            logger.info(f"Memory after model creation: {memory_after['ram_usage_mb']:.2f} MB")
            logger.info(f"Memory increase: {memory_after['ram_usage_mb'] - memory_before['ram_usage_mb']:.2f} MB")
            
            self.model = model
            return model
            
        except tf.errors.FailedPreconditionError as e:
            error_msg = f"FailedPreconditionError during model creation: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except tf.errors.InternalError as e:
            if "DNN library initialization failed" in str(e):
                error_msg = f"DNN library initialization failed: {e}. Try reducing batch size or memory limit."
                logger.error(error_msg)
                raise RuntimeError(error_msg)
            else:
                raise
                
        except Exception as e:
            error_msg = f"Unexpected error creating model: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def compile_model(self, learning_rate: float = 0.0001):
        """Compile the model with memory-efficient settings"""
        if self.model is None:
            raise ValueError("Model must be created before compilation")
        
        try:
            # Use a smaller learning rate for stability
            optimizer = Adam(
                learning_rate=learning_rate,
                beta_1=0.9,
                beta_2=0.999,
                epsilon=1e-07
            )
            
            # Compile with appropriate loss and metrics
            self.model.compile(
                optimizer=optimizer,
                loss='categorical_crossentropy',
                metrics=['accuracy', 'top_3_accuracy']
            )
            
            logger.info(f"Model compiled successfully with learning rate: {learning_rate}")
            logger.info(f"Model has {self.model.count_params():,} parameters")
            
        except Exception as e:
            error_msg = f"Error compiling model: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def create_data_generators(
        self, 
        train_dir: str, 
        validation_dir: str,
        target_size: Optional[Tuple[int, int]] = None
    ) -> Tuple[ImageDataGenerator, ImageDataGenerator]:
        """
        Create memory-efficient data generators
        """
        if target_size is None:
            target_size = self.input_shape[:2]
        
        try:
            # Reduced augmentation to save memory
            train_datagen = ImageDataGenerator(
                rescale=1.0/255.0,
                rotation_range=20,
                width_shift_range=0.1,
                height_shift_range=0.1,
                horizontal_flip=True,
                fill_mode='nearest',
                validation_split=0.0  # Use separate validation directory
            )
            
            validation_datagen = ImageDataGenerator(rescale=1.0/255.0)
            
            # Create generators with reduced batch size
            train_generator = train_datagen.flow_from_directory(
                train_dir,
                target_size=target_size,
                batch_size=self.batch_size,
                class_mode='categorical',
                shuffle=True
            )
            
            validation_generator = validation_datagen.flow_from_directory(
                validation_dir,
                target_size=target_size,
                batch_size=self.batch_size,
                class_mode='categorical',
                shuffle=False
            )
            
            logger.info(f"Data generators created with batch size: {self.batch_size}")
            logger.info(f"Training samples: {train_generator.samples}")
            logger.info(f"Validation samples: {validation_generator.samples}")
            
            return train_generator, validation_generator
            
        except Exception as e:
            error_msg = f"Error creating data generators: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def get_memory_efficient_callbacks(self, model_path: str = 'best_model.h5') -> list:
        """Get callbacks optimized for memory usage"""
        callback_list = [
            # Reduce learning rate on plateau
            callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=3,
                min_lr=1e-7,
                verbose=1
            ),
            
            # Early stopping to prevent overfitting
            callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            ),
            
            # Save best model
            callbacks.ModelCheckpoint(
                model_path,
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=False,  # Save full model
                verbose=1
            ),
            
            # Custom memory monitoring callback
            MemoryMonitorCallback()
        ]
        
        return callback_list
    
    def train(
        self,
        train_generator,
        validation_generator,
        epochs: int = 10,
        verbose: int = 1
    ):
        """
        Train the model with memory monitoring and error handling
        """
        if self.model is None:
            raise ValueError("Model must be created and compiled before training")
        
        try:
            logger.info(f"Starting training for {epochs} epochs...")
            logger.info(f"Batch size: {self.batch_size}")
            logger.info(f"Mixed precision: {self.mixed_precision}")
            
            # Calculate steps
            steps_per_epoch = max(1, train_generator.samples // self.batch_size)
            validation_steps = max(1, validation_generator.samples // self.batch_size)
            
            logger.info(f"Steps per epoch: {steps_per_epoch}")
            logger.info(f"Validation steps: {validation_steps}")
            
            # Get callbacks
            callback_list = self.get_memory_efficient_callbacks()
            
            # Train the model
            history = self.model.fit(
                train_generator,
                steps_per_epoch=steps_per_epoch,
                epochs=epochs,
                validation_data=validation_generator,
                validation_steps=validation_steps,
                callbacks=callback_list,
                verbose=verbose
            )
            
            logger.info("Training completed successfully")
            return history
            
        except tf.errors.ResourceExhaustedError as e:
            error_msg = f"Out of memory error during training: {e}. Try reducing batch size further."
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except tf.errors.FailedPreconditionError as e:
            error_msg = f"FailedPreconditionError during training: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except Exception as e:
            error_msg = f"Error during training: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def clear_memory(self):
        """Clear memory and run garbage collection"""
        if self.model:
            del self.model
            self.model = None
        
        tf.keras.backend.clear_session()
        gc.collect()
        logger.info("Memory cleared")


class MemoryMonitorCallback(callbacks.Callback):
    """Custom callback to monitor memory usage during training"""
    
    def __init__(self):
        super().__init__()
        self.memory_usage = []
    
    def on_epoch_end(self, epoch, logs=None):
        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024
        memory_percent = process.memory_percent()
        
        self.memory_usage.append({
            'epoch': epoch,
            'memory_mb': memory_mb,
            'memory_percent': memory_percent
        })
        
        logs = logs or {}
        logs['memory_mb'] = memory_mb
        logs['memory_percent'] = memory_percent
        
        print(f"\nEpoch {epoch + 1} - Memory usage: {memory_mb:.2f} MB ({memory_percent:.2f}%)")
        
        # Warning if memory usage is too high
        if memory_percent > 85:
            print(f"WARNING: High memory usage detected ({memory_percent:.2f}%)")


def main():
    """Example usage of the optimized Xception model"""
    try:
        # Create model with conservative settings
        model_trainer = MemoryOptimizedXceptionModel(
            input_shape=(299, 299, 3),
            num_classes=2,
            batch_size=2,  # Very small batch size
            mixed_precision=True,
            memory_limit_mb=2048
        )
        
        # Create and compile model
        model = model_trainer.create_model()
        model_trainer.compile_model(learning_rate=0.0001)
        
        # Print model summary (but limit output)
        logger.info("Model created successfully!")
        logger.info(f"Total parameters: {model.count_params():,}")
        
        # Example of how to use with data generators (commented out as we don't have actual data)
        """
        # Create data generators
        train_gen, val_gen = model_trainer.create_data_generators(
            train_dir='path/to/train',
            validation_dir='path/to/validation'
        )
        
        # Train the model
        history = model_trainer.train(
            train_gen,
            val_gen,
            epochs=10
        )
        """
        
        return model_trainer
        
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        raise


if __name__ == "__main__":
    # Set memory growth before importing TensorFlow
    os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
    
    # Run the example
    model_trainer = main()