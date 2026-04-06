import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';

const StockModal = ({ isOpen, onClose, onSubmit, isSubmitting, item, type }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isAdding = type === 'add';

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    
    // Pass back to parent component
    onSubmit({
      amount: numAmount,
      note: note.trim()
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <div className={`modal-icon ${isAdding ? 'add-icon-bg' : 'use-icon-bg'}`}>
              {isAdding ? <Plus size={20} /> : <Minus size={20} />}
            </div>
            <h2>{isAdding ? 'Add Stock' : 'Use Stock'}</h2>
          </div>
          <button onClick={onClose} className="btn-icon close-btn" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="item-context-box">
             <p className="item-title">{item.name}</p>
             <div className="qty-row">
               <span>Current Stock:</span> <strong>{item.quantity} {item.unit}</strong>
             </div>
          </div>

          <div className="input-group-vertical">
            <label>Quantity to {isAdding ? 'Add' : 'Use'} *</label>
            <input 
              type="number" 
              min="1"
              max={!isAdding ? item.quantity : undefined}
              placeholder="e.g. 5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
            {!isAdding && amount > item.quantity && (
               <span className="error-text">Cannot use more than current stock</span>
            )}
          </div>

          <div className="input-group-vertical">
            <label>Notes / Reason {isAdding ? '(Optional)' : '*'}</label>
            <textarea 
              className="premium-textarea"
              placeholder={isAdding ? "e.g. New shipment arrived" : "e.g. Used for project X"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required={!isAdding}
              rows="2"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn ${isAdding ? 'btn-success' : 'btn-danger'}`} 
              disabled={isSubmitting || !amount || (!isAdding && amount > item.quantity) || (!isAdding && !note.trim())}
            >
              {isSubmitting ? 'Saving...' : `Confirm ${isAdding ? 'Add' : 'Use'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockModal;
