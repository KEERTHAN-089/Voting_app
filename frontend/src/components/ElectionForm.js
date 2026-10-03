import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import Icon from './Icon';

export const SELFIE_MODES = {
  none: 'No selfie. Fastest for voters.',
  photo: 'Photo record. Each voter takes a selfie when voting; you can review it if a vote is disputed.',
  faceMatch: 'Face match. Voters take a selfie when joining, and their face is checked again before they vote.'
};

// Creates a session, or edits one when `initialData` is given
const ElectionForm = ({ initialData, selfieLocked, onSaved, onCancel }) => {
  const editing = Boolean(initialData);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    maxVoters: initialData?.maxVoters || 60,
    selfieMode: initialData?.selfieMode || 'none',
    resultsVisible: initialData?.resultsVisible || 'afterClose',
    allowList: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { allowList, ...settings } = formData;
      settings.maxVoters = Number(settings.maxVoters);
      if (editing) {
        if (selfieLocked) delete settings.selfieMode;
        await api.put(`/elections/${initialData._id}/manage`, settings);
        onSaved();
      } else {
        const response = await api.post('/elections', { ...settings, allowList });
        navigate(`/elections/${response.data.election._id}/manage?tab=candidates`);
      }
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className={editing ? 'election-form' : 'register-container election-form'}>
      {!editing && (
        <>
          <h2>Create a voting session</h2>
          <p className="form-hint">You can change any of this later, up until voting opens.</p>
        </>
      )}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="title">What is the vote for? <span className="required">*</span></label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={onChange}
            placeholder="Class leader, 3rd year CSE-A"
            maxLength={120}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Details for voters (optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={onChange}
            maxLength={1000}
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="maxVoters">Maximum number of voters <span className="required">*</span></label>
          <input
            type="number"
            id="maxVoters"
            name="maxVoters"
            value={formData.maxVoters}
            onChange={onChange}
            min="1"
            max="5000"
            required
          />
          <p className="form-hint">No more than this many people can be approved, so there can never be more votes than this.</p>
        </div>

        <div className="form-group">
          <label htmlFor="selfieMode">Selfie check</label>
          <select
            id="selfieMode"
            name="selfieMode"
            value={formData.selfieMode}
            onChange={onChange}
            disabled={selfieLocked}
          >
            <option value="none">No selfie</option>
            <option value="photo">Photo record</option>
            <option value="faceMatch">Face match</option>
          </select>
          <p className="form-hint">
            {selfieLocked ? 'This cannot change after voters have joined.' : SELFIE_MODES[formData.selfieMode]}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="resultsVisible">When can voters see results?</label>
          <select id="resultsVisible" name="resultsVisible" value={formData.resultsVisible} onChange={onChange}>
            <option value="afterClose">After I close the session</option>
            <option value="live">Live, while voting is open</option>
          </select>
        </div>

        {!editing && (
          <div className="form-group">
            <label htmlFor="allowList">Voter emails (optional)</label>
            <textarea
              id="allowList"
              name="allowList"
              value={formData.allowList}
              onChange={onChange}
              rows={4}
              placeholder={'asha@college.edu\nravi@college.edu'}
            />
            <p className="form-hint">
              Paste your list, one email per line or separated by commas. These people are approved automatically when they join.
              Anyone else waits for you to approve them. You can add more later.
            </p>
          </div>
        )}

        <div className="form-buttons">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create session'}
            {!saving && !editing && <Icon name="arrowRight" />}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ElectionForm;
