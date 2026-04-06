import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAllUserItems } from '../firebase/db';
import { auth } from '../firebase/config';
import './BillModal.css';

const BillModal = ({ isOpen, onClose }) => {
  const [clientName, setClientName] = useState('');
  const [inventory, setInventory] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      // Reset state
      setBillItems([]);
      setClientName('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchInventory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const res = await getAllUserItems(user.uid);
    if (res.success) setInventory(res.data);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 1) {
      const filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) || 
        (item.sku && item.sku.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addLineItem = (item) => {
    const newItem = {
      id: item.id,
      name: item.name,
      sku: item.sku || '',
      unit: item.unit || 'pcs',
      quantity: 1,
      rate: '', // User will input
      total: 0
    };
    setBillItems([...billItems, newItem]);
    setSearchQuery('');
    setSuggestions([]);
  };

  const removeLineItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    
    // Update total for this line
    const qty = parseFloat(updated[index].quantity) || 0;
    const rate = parseFloat(updated[index].rate) || 0;
    updated[index].total = qty * rate;
    
    setBillItems(updated);
  };

  const calculateGrandTotal = () => {
    return billItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const generatePDF = async () => {
    if (billItems.length === 0) return alert('Please add at least one item.');
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // ══ BRANDING ══
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('NOOR CREATION', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Premium Stock Management', 14, 26);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(8);
      doc.text('MOB: +91 9993309902', pageWidth - 14, 18, { align: 'right' });
      doc.text('EMAIL: noorcreation@gmail.com', pageWidth - 14, 23, { align: 'right' });
      doc.text('Burhanpur, Madhya Pradesh, India', pageWidth - 14, 28, { align: 'right' });

      // ══ INVOICE INFO ══
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 45, pageWidth, 25, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('INVOICE', 14, 58);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`DATE: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 14, 55, { align: 'right' });
      doc.text(`BILL NO: NC-${Date.now().toString().slice(-6)}`, pageWidth - 14, 61, { align: 'right' });

      // Client Info
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`BILL TO: ${clientName || 'Valued Customer'}`, 14, 78);

      // ══ TABLE ══
      autoTable(doc, {
        startY: 85,
        head: [['#', 'Item Description', 'Quantity', 'Rate', 'Total']],
        body: billItems.map((item, idx) => [
          idx + 1,
          `${item.name}${item.sku ? ' (#' + item.sku + ')' : ''}`,
          `${item.quantity} ${item.unit}`,
          `Rs ${item.rate}`,
          `Rs ${item.total.toFixed(2)}`
        ]),
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 10 },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        },
        styles: { fontSize: 9 }
      });

      // ══ TOTALS ══
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Grand Total:', pageWidth - 60, finalY);
      doc.text(`Rs ${calculateGrandTotal().toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for your business!', pageWidth / 2, finalY + 30, { align: 'center' });

      doc.save(`Bill_${clientName || 'Customer'}_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="bill-modal glass-panel fade-in-up">
        <div className="bill-modal-header">
          <div className="header-title">
            <FileText size={24} className="icon-blue" />
            <div>
              <h3>Generate Professional Bill</h3>
              <p>Create a branded invoice for your customers</p>
            </div>
          </div>
          <button className="btn-icon close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="bill-modal-content">
          {/* Client Info */}
          <div className="input-group">
            <label>Customer Name</label>
            <input 
              type="text" 
              placeholder="Enter customer name..." 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="premium-input-bill"
            />
          </div>

          {/* Item Search */}
          <div className="item-search-container">
            <label>Add Items from Stock</label>
            <div className="search-box-bill">
              <Search size={18} className="search-icon-bill" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search by item name or SKU..." 
                value={searchQuery}
                onChange={handleSearch}
                className="premium-input-bill search-input-bill"
              />
              {suggestions.length > 0 && (
                <div className="suggestions-list-bill glass-panel">
                  {suggestions.map(item => (
                    <div 
                      key={item.id} 
                      className="suggestion-item-bill"
                      onClick={() => addLineItem(item)}
                    >
                      <div className="suggestion-info-bill">
                        <strong>{item.name}</strong>
                        <span>{item.sku} · {item.quantity} {item.unit} left</span>
                      </div>
                      <Plus size={16} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bill Items List */}
          <div className="bill-items-area">
             <div className="items-list-header-bill">
                <span className="col-desc">Item</span>
                <span className="col-qty">Qty</span>
                <span className="col-rate">Rate (Rs)</span>
                <span className="col-total">Total</span>
                <span className="col-action"></span>
             </div>
             <div className="items-list-body-bill">
                {billItems.length === 0 ? (
                  <div className="empty-bill-state">
                    <p>No items added. Search above to add items.</p>
                  </div>
                ) : (
                  billItems.map((item, idx) => (
                    <div key={idx} className="bill-line-item">
                       <div className="col-desc">
                          <span className="item-name-bill">{item.name}</span>
                          <span className="item-sku-bill">{item.sku}</span>
                       </div>
                       <div className="col-qty">
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          />
                       </div>
                       <div className="col-rate">
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={item.rate}
                            onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                          />
                       </div>
                       <div className="col-total">
                          Rs{item.total.toFixed(2)}
                       </div>
                       <div className="col-action">
                          <button onClick={() => removeLineItem(idx)} className="delete-btn-bill">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        <div className="bill-modal-footer">
          <div className="bill-summary">
             <span>Items: <strong>{billItems.length}</strong></span>
             <span>Grand Total: <strong className="total-value">Rs {calculateGrandTotal().toFixed(2)}</strong></span>
          </div>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn btn-primary btn-generate" 
              onClick={generatePDF}
              disabled={billItems.length === 0 || isGenerating}
            >
              {isGenerating ? 'Generating...' : <><Download size={18} /> Generate PDF</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
