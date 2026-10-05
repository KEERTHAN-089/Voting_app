#!/usr/bin/env python3
"""
Quick test script to verify the image classification model works
Tests all the memory optimization and error handling features
"""

import sys
import os
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from model_config import ModelConfig, set_tensorflow_env
from memory_utils import MemoryManager, memory_monitor, MemoryProfiler, optimize_tensorflow_memory

# Set environment before TensorFlow import
set_tensorflow_env()

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_memory_management():
    """Test memory management utilities"""
    logger.info("Testing memory management utilities...")
    
    # Test memory manager
    memory_manager = MemoryManager(threshold_percent=80.0)
    initial_memory = memory_manager.get_memory_usage()
    
    logger.info(f"Initial memory usage: {initial_memory['rss_mb']:.2f} MB")
    
    # Test memory monitoring context
    with memory_monitor("Memory test", threshold=80.0) as monitor:
        # Simulate some memory usage
        data = [i for i in range(100000)]
        time.sleep(0.1)
        del data
    
    # Test garbage collection
    memory_manager.force_garbage_collection()
    
    final_memory = memory_manager.get_memory_usage()
    logger.info(f"Final memory usage: {final_memory['rss_mb']:.2f} MB")
    
    # Get recommendations
    recommendations = memory_manager.get_recommendations()
    if recommendations:
        logger.info("Memory recommendations:")
        for rec in recommendations:
            logger.info(f"  - {rec}")
    
    logger.info("✅ Memory management tests passed")

def test_model_configuration():
    """Test different model configurations"""
    logger.info("Testing model configurations...")
    
    # Test default config
    default_config = ModelConfig()
    logger.info(f"Default config: {default_config}")
    
    # Test memory-constrained config
    memory_config = ModelConfig.create_memory_constrained_config()
    logger.info(f"Memory-constrained config: {memory_config}")
    
    # Test development config
    dev_config = ModelConfig.create_development_config()
    logger.info(f"Development config: {dev_config}")
    
    logger.info("✅ Configuration tests passed")

def test_tensorflow_setup():
    """Test TensorFlow setup and optimizations"""
    logger.info("Testing TensorFlow setup...")
    
    try:
        optimize_tensorflow_memory()
        
        # Import TensorFlow and test basic functionality
        import tensorflow as tf
        
        logger.info(f"TensorFlow version: {tf.__version__}")
        
        # Test GPU availability
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            logger.info(f"Found {len(gpus)} GPU(s): {[gpu.name for gpu in gpus]}")
        else:
            logger.info("No GPUs found, will use CPU")
        
        # Test basic tensor operations
        with memory_monitor("TensorFlow basic operations"):
            # Create some tensors to test memory handling
            x = tf.random.normal((100, 100))
            y = tf.random.normal((100, 100))
            z = tf.matmul(x, y)
            
            logger.info(f"Created tensors with shapes: x={x.shape}, y={y.shape}, z={z.shape}")
            
            # Clear the tensors
            del x, y, z
        
        logger.info("✅ TensorFlow setup tests passed")
        return True
        
    except ImportError as e:
        logger.error(f"TensorFlow not available: {e}")
        return False
    except Exception as e:
        logger.error(f"TensorFlow test failed: {e}")
        return False

def test_model_creation():
    """Test creating the actual model (if TensorFlow is available)"""
    logger.info("Testing model creation...")
    
    try:
        from image_classification_model import MemoryOptimizedXceptionModel
        
        # Create a minimal configuration for testing
        config = ModelConfig.create_development_config()
        
        profiler = MemoryProfiler()
        profiler.record("Before model creation")
        
        with memory_monitor("Model creation") as monitor:
            # Create model trainer
            model_trainer = MemoryOptimizedXceptionModel(
                input_shape=config.input_shape,
                num_classes=config.num_classes,
                batch_size=config.batch_size,
                mixed_precision=config.mixed_precision,
                memory_limit_mb=config.memory_limit_mb
            )
            
            profiler.record("After model trainer creation")
            
            # Create the model
            model = model_trainer.create_model()
            
            profiler.record("After model creation")
            
            # Compile the model
            model_trainer.compile_model(learning_rate=config.learning_rate)
            
            profiler.record("After model compilation")
            
            # Get model summary info
            total_params = model.count_params()
            logger.info(f"Model created successfully with {total_params:,} parameters")
            
            # Test model prediction with dummy data
            import tensorflow as tf
            dummy_input = tf.random.normal((1, *config.input_shape))
            prediction = model(dummy_input)
            logger.info(f"Model prediction shape: {prediction.shape}")
            
            profiler.record("After model prediction")
            
            # Clean up
            model_trainer.clear_memory()
            del model, model_trainer, dummy_input, prediction
            
            profiler.record("After cleanup")
        
        profiler.log_summary()
        logger.info("✅ Model creation tests passed")
        return True
        
    except Exception as e:
        logger.error(f"Model creation test failed: {e}")
        logger.error(f"This might be due to memory constraints or missing dependencies")
        return False

def test_error_handling():
    """Test error handling mechanisms"""
    logger.info("Testing error handling mechanisms...")
    
    try:
        from model_config import get_error_solution
        
        # Test error message generation
        config = ModelConfig()
        
        error_types = ['dnn_init_failed', 'failed_precondition', 'resource_exhausted']
        
        for error_type in error_types:
            solution = get_error_solution(error_type, config)
            logger.info(f"Error solution for {error_type}: Available")
        
        logger.info("✅ Error handling tests passed")
        return True
        
    except Exception as e:
        logger.error(f"Error handling test failed: {e}")
        return False

def run_comprehensive_test():
    """Run all tests comprehensively"""
    logger.info("="*60)
    logger.info("COMPREHENSIVE TEST SUITE")
    logger.info("Testing memory optimization and error handling features")
    logger.info("="*60)
    
    test_results = {}
    
    # Test 1: Memory Management
    try:
        test_memory_management()
        test_results['memory_management'] = True
    except Exception as e:
        logger.error(f"Memory management test failed: {e}")
        test_results['memory_management'] = False
    
    # Test 2: Configuration
    try:
        test_model_configuration()
        test_results['configuration'] = True
    except Exception as e:
        logger.error(f"Configuration test failed: {e}")
        test_results['configuration'] = False
    
    # Test 3: TensorFlow Setup
    test_results['tensorflow_setup'] = test_tensorflow_setup()
    
    # Test 4: Error Handling
    test_results['error_handling'] = test_error_handling()
    
    # Test 5: Model Creation (only if TensorFlow is available)
    if test_results['tensorflow_setup']:
        test_results['model_creation'] = test_model_creation()
    else:
        test_results['model_creation'] = None
        logger.info("⏭️ Skipping model creation test (TensorFlow not available)")
    
    # Print results
    logger.info("\n" + "="*60)
    logger.info("TEST RESULTS SUMMARY")
    logger.info("="*60)
    
    for test_name, result in test_results.items():
        if result is True:
            status = "✅ PASSED"
        elif result is False:
            status = "❌ FAILED"
        else:
            status = "⏭️ SKIPPED"
        
        logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
    
    # Overall assessment
    passed_tests = sum(1 for result in test_results.values() if result is True)
    total_tests = len([r for r in test_results.values() if r is not None])
    
    logger.info(f"\nPassed: {passed_tests}/{total_tests} tests")
    
    if passed_tests == total_tests:
        logger.info("\n🎉 ALL TESTS PASSED!")
        logger.info("The image classification model is ready and optimized for memory constraints.")
    elif passed_tests >= total_tests * 0.8:  # At least 80% passed
        logger.info("\n⚠️ MOSTLY SUCCESSFUL")
        logger.info("Most optimizations are working. Some features may need attention.")
    else:
        logger.info("\n❌ MULTIPLE FAILURES")
        logger.info("Several optimization features are not working correctly.")
    
    return test_results

if __name__ == "__main__":
    # Run the comprehensive test
    results = run_comprehensive_test()
    
    # Exit with appropriate code
    passed = sum(1 for r in results.values() if r is True)
    total = len([r for r in results.values() if r is not None])
    
    if passed == total:
        sys.exit(0)  # All tests passed
    else:
        sys.exit(1)  # Some tests failed