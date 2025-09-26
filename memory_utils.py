#!/usr/bin/env python3
"""
Utility functions for memory management and optimization
Provides tools to monitor and optimize memory usage during training
"""

import gc
import os
import psutil
import logging
from typing import Dict, List, Optional, Tuple, Any
from contextlib import contextmanager
import time

logger = logging.getLogger(__name__)

class MemoryManager:
    """Class to manage and monitor memory usage"""
    
    def __init__(self, threshold_percent: float = 85.0):
        self.threshold_percent = threshold_percent
        self.initial_memory = self.get_memory_usage()
        self.peak_memory = 0.0
        
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics"""
        process = psutil.Process()
        memory_info = process.memory_info()
        system_memory = psutil.virtual_memory()
        
        return {
            'rss_mb': memory_info.rss / 1024 / 1024,  # Resident Set Size
            'vms_mb': memory_info.vms / 1024 / 1024,  # Virtual Memory Size
            'percent': process.memory_percent(),
            'available_mb': system_memory.available / 1024 / 1024,
            'total_mb': system_memory.total / 1024 / 1024,
            'system_percent': system_memory.percent
        }
    
    def check_memory_threshold(self) -> bool:
        """Check if memory usage exceeds threshold"""
        memory_info = self.get_memory_usage()
        self.peak_memory = max(self.peak_memory, memory_info['rss_mb'])
        
        if memory_info['system_percent'] > self.threshold_percent:
            logger.warning(f"Memory usage ({memory_info['system_percent']:.2f}%) exceeds threshold ({self.threshold_percent}%)")
            return True
        return False
    
    def force_garbage_collection(self):
        """Force garbage collection and clear caches"""
        logger.info("Forcing garbage collection...")
        
        # Force garbage collection
        collected = gc.collect()
        
        # Clear TensorFlow cache if available
        try:
            import tensorflow as tf
            tf.keras.backend.clear_session()
        except ImportError:
            pass
        
        memory_after = self.get_memory_usage()
        logger.info(f"Garbage collection collected {collected} objects")
        logger.info(f"Memory after cleanup: {memory_after['rss_mb']:.2f} MB")
    
    def get_recommendations(self) -> List[str]:
        """Get recommendations based on current memory usage"""
        memory_info = self.get_memory_usage()
        recommendations = []
        
        if memory_info['system_percent'] > 90:
            recommendations.extend([
                "Reduce batch size to 1",
                "Use smaller input image size",
                "Disable mixed precision if enabled",
                "Consider using CPU instead of GPU"
            ])
        elif memory_info['system_percent'] > 80:
            recommendations.extend([
                "Reduce batch size by half",
                "Enable gradient checkpointing",
                "Freeze more model layers"
            ])
        elif memory_info['system_percent'] > 70:
            recommendations.extend([
                "Enable mixed precision training",
                "Use tf.data pipeline optimizations"
            ])
        
        return recommendations
    
    def log_memory_summary(self):
        """Log a summary of memory usage"""
        current_memory = self.get_memory_usage()
        memory_increase = current_memory['rss_mb'] - self.initial_memory['rss_mb']
        
        logger.info("="*50)
        logger.info("MEMORY USAGE SUMMARY")
        logger.info("="*50)
        logger.info(f"Initial memory: {self.initial_memory['rss_mb']:.2f} MB")
        logger.info(f"Current memory: {current_memory['rss_mb']:.2f} MB")
        logger.info(f"Peak memory: {self.peak_memory:.2f} MB")
        logger.info(f"Memory increase: {memory_increase:.2f} MB")
        logger.info(f"System memory usage: {current_memory['system_percent']:.2f}%")
        logger.info(f"Available memory: {current_memory['available_mb']:.2f} MB")
        logger.info("="*50)


@contextmanager
def memory_monitor(name: str = "Operation", threshold: float = 85.0):
    """Context manager to monitor memory usage during operations"""
    manager = MemoryManager(threshold)
    start_memory = manager.get_memory_usage()
    
    logger.info(f"Starting {name} - Memory: {start_memory['rss_mb']:.2f} MB")
    
    try:
        yield manager
    finally:
        end_memory = manager.get_memory_usage()
        memory_diff = end_memory['rss_mb'] - start_memory['rss_mb']
        
        logger.info(f"Finished {name} - Memory: {end_memory['rss_mb']:.2f} MB (Δ{memory_diff:+.2f} MB)")
        
        if memory_diff > 100:  # More than 100MB increase
            logger.warning(f"Large memory increase detected for {name}: {memory_diff:.2f} MB")


class GPUMemoryManager:
    """Manage GPU memory if available"""
    
    def __init__(self):
        self.gpu_available = self._check_gpu_availability()
        
    def _check_gpu_availability(self) -> bool:
        """Check if GPU is available"""
        try:
            import tensorflow as tf
            return len(tf.config.experimental.list_physical_devices('GPU')) > 0
        except ImportError:
            return False
    
    def get_gpu_memory_info(self) -> Optional[Dict[str, Any]]:
        """Get GPU memory information"""
        if not self.gpu_available:
            return None
            
        try:
            import tensorflow as tf
            gpus = tf.config.experimental.list_physical_devices('GPU')
            if gpus:
                # For now, just return basic info
                return {
                    'gpu_count': len(gpus),
                    'gpus': [gpu.name for gpu in gpus]
                }
        except Exception as e:
            logger.warning(f"Could not get GPU memory info: {e}")
        
        return None
    
    def configure_gpu_memory_growth(self):
        """Configure GPU memory growth"""
        if not self.gpu_available:
            logger.info("No GPU available, using CPU")
            return
            
        try:
            import tensorflow as tf
            gpus = tf.config.experimental.list_physical_devices('GPU')
            
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                logger.info(f"Configured memory growth for {len(gpus)} GPU(s)")
            
        except Exception as e:
            logger.warning(f"Could not configure GPU memory growth: {e}")


def optimize_tensorflow_memory():
    """Apply TensorFlow memory optimizations"""
    logger.info("Applying TensorFlow memory optimizations...")
    
    try:
        import tensorflow as tf
        
        # Configure GPU memory growth
        gpu_manager = GPUMemoryManager()
        gpu_manager.configure_gpu_memory_growth()
        
        # Set threading options for CPU
        tf.config.threading.set_inter_op_parallelism_threads(2)
        tf.config.threading.set_intra_op_parallelism_threads(2)
        
        # Enable memory optimization
        os.environ['TF_GPU_ALLOCATOR'] = 'cuda_malloc_async'
        
        logger.info("TensorFlow memory optimizations applied successfully")
        
    except ImportError:
        logger.warning("TensorFlow not available for memory optimization")
    except Exception as e:
        logger.warning(f"Could not apply TensorFlow optimizations: {e}")


def get_optimal_batch_size(
    model_memory_mb: float,
    available_memory_mb: float,
    safety_factor: float = 0.7
) -> int:
    """Calculate optimal batch size based on available memory"""
    
    # Reserve memory for system and other processes
    usable_memory = available_memory_mb * safety_factor
    
    # Estimate memory per sample (rough approximation)
    memory_per_sample = model_memory_mb / 10  # Conservative estimate
    
    if memory_per_sample > 0:
        optimal_batch_size = max(1, int(usable_memory / memory_per_sample))
    else:
        optimal_batch_size = 2  # Default conservative value
    
    # Ensure batch size is reasonable
    optimal_batch_size = min(optimal_batch_size, 32)  # Cap at 32
    optimal_batch_size = max(optimal_batch_size, 1)   # Minimum 1
    
    logger.info(f"Calculated optimal batch size: {optimal_batch_size}")
    logger.info(f"Based on: available_memory={available_memory_mb:.2f}MB, "
                f"model_memory={model_memory_mb:.2f}MB")
    
    return optimal_batch_size


def cleanup_memory():
    """Comprehensive memory cleanup"""
    logger.info("Performing comprehensive memory cleanup...")
    
    # Python garbage collection
    collected = gc.collect()
    logger.info(f"Garbage collection freed {collected} objects")
    
    # TensorFlow cleanup
    try:
        import tensorflow as tf
        tf.keras.backend.clear_session()
        logger.info("TensorFlow session cleared")
    except ImportError:
        pass
    
    # Force memory return to OS (Linux only)
    try:
        import ctypes
        libc = ctypes.CDLL("libc.so.6")
        libc.malloc_trim(0)
        logger.info("Memory trimmed and returned to OS")
    except (OSError, AttributeError):
        pass  # Not on Linux or libc not available


class MemoryProfiler:
    """Simple memory profiler for tracking memory usage over time"""
    
    def __init__(self):
        self.memory_history: List[Tuple[float, float]] = []
        self.start_time = time.time()
    
    def record(self, tag: str = ""):
        """Record current memory usage"""
        current_time = time.time() - self.start_time
        memory_info = MemoryManager().get_memory_usage()
        
        self.memory_history.append((current_time, memory_info['rss_mb']))
        
        if tag:
            logger.info(f"[{tag}] Memory: {memory_info['rss_mb']:.2f} MB at {current_time:.2f}s")
    
    def get_peak_memory(self) -> float:
        """Get peak memory usage"""
        if not self.memory_history:
            return 0.0
        return max(memory for _, memory in self.memory_history)
    
    def get_memory_trend(self) -> str:
        """Get memory usage trend"""
        if len(self.memory_history) < 2:
            return "insufficient_data"
        
        recent_memories = [memory for _, memory in self.memory_history[-5:]]
        if len(recent_memories) < 2:
            return "stable"
        
        trend = recent_memories[-1] - recent_memories[0]
        
        if trend > 50:  # More than 50MB increase
            return "increasing"
        elif trend < -50:  # More than 50MB decrease
            return "decreasing"
        else:
            return "stable"
    
    def log_summary(self):
        """Log profiling summary"""
        if not self.memory_history:
            logger.info("No memory data recorded")
            return
        
        initial_memory = self.memory_history[0][1]
        final_memory = self.memory_history[-1][1]
        peak_memory = self.get_peak_memory()
        trend = self.get_memory_trend()
        
        logger.info("="*50)
        logger.info("MEMORY PROFILING SUMMARY")
        logger.info("="*50)
        logger.info(f"Initial memory: {initial_memory:.2f} MB")
        logger.info(f"Final memory: {final_memory:.2f} MB")
        logger.info(f"Peak memory: {peak_memory:.2f} MB")
        logger.info(f"Memory change: {final_memory - initial_memory:+.2f} MB")
        logger.info(f"Memory trend: {trend}")
        logger.info(f"Total duration: {self.memory_history[-1][0]:.2f} seconds")
        logger.info("="*50)