import React, { useState, useEffect } from 'react';
import api, { errorMessage, imageUrl } from '../utils/api';
import { resizeImageFile } from '../utils/image';
import Icon from './Icon';

const CandidateForm = ({ electionId, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    party: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        party: initialData.party || ''
      });
      setImage(null);
      setImagePreview(imageUrl(initialData.image));
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Shrink the photo in the browser so uploads stay small and fast
      const resized = await resizeImageFile(file);
      setError('');
      setImage(resized);
      setImagePreview(URL.createObjectURL(resized));
    } catch (err) {
      setError(err.message);
      e.target.value = ''; // Clear the file input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Create FormData object to handle file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('party', formData.party);
      if (image) {
        submitData.append('image', image, 'photo.jpg');
      }

      const base = `/elections/${electionId}/manage/candidates`;
      const response = initialData
        ? await api.put(`${base}/${initialData._id}`, submitData)
        : await api.post(base, submitData);

      // Show success message
      setSuccess(initialData ? 'Candidate updated successfully!' : 'Candidate added successfully!');

      // Reset form if adding a new candidate
      if (!initialData) {
        setFormData({ name: '', party: '' });
        setImage(null);
        setImagePreview(null);
        e.target.reset();
      }

      // Call parent submit handler if provided
      if (onSubmit) onSubmit(response.data);

    } catch (err) {
      console.error('Error submitting form:', err);
      setError(errorMessage(err, 'An error occurred while saving the candidate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-form">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {success && (
        <div className="alert alert-success" role="status">
          <Icon name="checkCircle" />
          <div>{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Candidate name <span className="required">*</span></label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            maxLength={80}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="party">Group / tagline (optional)</label>
          <input
            type="text"
            id="party"
            name="party"
            value={formData.party}
            onChange={handleInputChange}
            maxLength={120}
            placeholder="Section A, or a one-line pitch"
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Candidate photo (optional)</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="form-hint">Square photos look best. Large files are shrunk before upload.</p>
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
            {!initialData && <Icon name="plus" />}
            {loading ? 'Saving...' : initialData ? 'Update candidate' : 'Add candidate'}
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
