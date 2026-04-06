import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import './CategoryModal.css';

const COLORS = [
  { id: 'blue', hex: '#3b82f6' },
  { id: 'emerald', hex: '#10b981' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'red', hex: '#ef4444' },
  { id: 'purple', hex: '#8b5cf6' },
  { id: 'pink', hex: '#ec4899' },
  { id: 'slate', hex: '#64748b' }
];

const CategoryModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].hex);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, color });
    // Reset state after submit
    setName('');
    setColor(COLORS[0].hex);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <div className="modal-icon" style={{ backgroundColor: `${color}20`, color }}>
              <Layers size={20} />
            </div>
            <h2>Create New Category</h2>
          </div>
          <button onClick={onClose} className="btn-icon close-btn" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group-vertical">
            <label>Category Name</label>
            <input 
              type="text" 
              placeholder="e.g. Electronics, Stationary..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              maxLength={30}
            />
          </div>

          <div className="input-group-vertical">
            <label>Category Color</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`color-option ${color === c.hex ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.hex)}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
