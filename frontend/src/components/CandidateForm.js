import React, { useState, useEffect } from 'react';

const CandidateForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    age: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        party: initialData.party || '',
        age: initialData.age || '',
        image: null
      });
      
      // If there's an image URL in the initial data
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.party) {
      setError('Name and party are required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Create a FormData object to handle file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('party', formData.party);
      if (formData.age) {
        submitData.append('age', formData.age);
      }
      if (formData.image) {
        submitData.append('image', formData.image);
      }
      
      const result = await onSubmit(submitData);
      
      if (result.success) {
        setSuccess(initialData ? 'Candidate updated successfully' : 'Candidate added successfully');
        if (!initialData) {
          // Clear form after adding (not when editing)
          setFormData({
            name: '',
            party: '',
            age: '',
            image: null
          });
          setImagePreview(null);
        }
      } else {
        setError(result.message || 'Error processing candidate');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="candidate-form">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Candidate Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="party">Political Party</label>
          <input
            type="text"
            id="party"
            name="party"
            value={formData.party}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="age">Age (optional)</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            min="18"
            max="120"
          />
        </div>
        
        <div className="form-group image-upload-container">
          <label className="image-upload-label" htmlFor="image">Candidate Image (optional)</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
          
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Candidate preview" />
            </div>
          )}
        </div>
        
        <div className="form-buttons">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : initialData ? 'Update Candidate' : 'Add Candidate'}
          </button>
          
          {initialData && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onCancel}
              disabled={isSubmitting}
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
