import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const CandidateForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    age: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        party: initialData.party || '',
        age: initialData.age || ''
      });
      
      // If there's an image, fetch and set the preview
      if (initialData.imageId) {
        setImagePreview(`/api/candidates/image/${initialData.imageId}`);
      }
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.party.trim()) {
      newErrors.party = 'Party is required';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // Create FormData object to handle file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('party', formData.party);
      if (formData.age) {
        submitData.append('age', formData.age);
      }
      if (image) {
        submitData.append('image', image);
      }
      
      let result;
      if (initialData) {
        // Update existing candidate
        const response = await api.put(`/api/candidates/${initialData._id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        result = { success: true, data: response.data };
      } else {
        // Create new candidate
        const response = await api.post('/api/candidates', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        result = { success: true, data: response.data };
      }
      
      setSuccess(initialData ? 'Candidate updated successfully!' : 'Candidate added successfully!');
      
      // Reset form if adding a new candidate
      if (!initialData) {
        setFormData({ name: '', party: '', age: '' });
        setImage(null);
        setImagePreview(null);
      }
      
      // Call parent submit handler if provided
      if (onSubmit) onSubmit(result);
      
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-form">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Candidate Name <span className="required">*</span></label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className={formErrors.name ? 'error' : ''}
          />
          {formErrors.name && <div className="error-message">{formErrors.name}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="party">Political Party <span className="required">*</span></label>
          <input
            type="text"
            id="party"
            name="party"
            value={formData.party}
            onChange={handleInputChange}
            required
            className={formErrors.party ? 'error' : ''}
          />
          {formErrors.party && <div className="error-message">{formErrors.party}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="age">Age (optional)</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            min="18"
            max="120"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="image">Candidate Photo</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>
        
        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
          </div>
        )}
        
        <div className="form-buttons">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : initialData ? 'Update Candidate' : 'Add Candidate'}
          </button>
          
          {initialData && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CandidateForm;
