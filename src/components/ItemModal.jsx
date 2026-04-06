import React, { useState } from 'react';
import { X, Box } from 'lucide-react';
import './CategoryModal.css'; // Borrowing base modal styles

const UNITS = ['pcs', 'kg', 'litre', 'box', 'pack', 'pair', 'meter'];

const ItemModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [quantity, setQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || quantity === '' || minStockLevel === '') return;
    
    onSubmit({ 
      name, 
      sku, 
      unit, 
      quantity: Number(quantity), 
      minStockLevel: Number(minStockLevel),
      notes 
    });
    
    // Reset state after submit
    setName('');
    setSku('');
    setUnit(UNITS[0]);
    setQuantity('');
    setMinStockLevel('');
    setNotes('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <div className="modal-icon" style={{ backgroundColor: `#2563eb20`, color: '#2563eb' }}>
              <Box size={20} />
            </div>
            <h2>Add New Item</h2>
          </div>
          <button onClick={onClose} className="btn-icon close-btn" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-row">
            <div className="input-group-vertical" style={{flex: 2}}>
              <label>Item Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Macbook Pro, A4 Paper"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="input-group-vertical" style={{flex: 1}}>
              <label>SKU / Code</label>
              <input 
                type="text" 
                placeholder="Optional"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="input-row">
             <div className="input-group-vertical" style={{flex: 1}}>
              <label>Opening Qty *</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="input-group-vertical" style={{flex: 1}}>
              <label>Unit</label>
              <select className="premium-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group-vertical">
            <label>Min Stock Alert Level *</label>
            <input 
              type="number" 
              min="0"
              placeholder="Alert when stock falls below this"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
              required
            />
          </div>

          <div className="input-group-vertical">
            <label>Description / Notes</label>
            <textarea 
              className="premium-textarea"
              placeholder="Optional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
