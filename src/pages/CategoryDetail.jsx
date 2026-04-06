import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2, Box, TrendingDown, AlertCircle, Minus, Share2, History, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { subscribeToItems, getCategoryDetails, addItem, deleteItem, adjustStock, subscribeToCategoryTransactions } from '../firebase/db';
import { auth } from '../firebase/config';
import ItemModal from '../components/ItemModal';
import StockModal from '../components/StockModal';
import './CategoryDetail.css';

const CategoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockModalConfig, setStockModalConfig] = useState({ isOpen: false, item: null, type: 'add' });
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'activity'
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Fetch Category Detail Top Level
    const fetchCat = async () => {
      const res = await getCategoryDetails(id);
      if (res.success) setCategory(res.data);
      else navigate('/dashboard');
    };
    fetchCat();

    const unsubItems = subscribeToItems(id, (data) => {
      setItems(data);
    });

    // Subscribe to Activity Log
    const unsubTx = subscribeToCategoryTransactions(id, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubItems();
      unsubTx();
    };
  }, [id, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleAddItem = async (itemData) => {
    setIsSubmitting(true);
    const result = await addItem(id, itemData);
    setIsSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert("Failed to add item: " + result.error);
    }
  };

  const handleDelete = async (itemId) => {
    if(window.confirm("Delete this item permanently?")) {
      await deleteItem(id, itemId);
    }
  };

  const openStockModal = (item, type) => {
    setStockModalConfig({ isOpen: true, item, type });
  };

  const handleStockSubmit = async ({ amount, note }) => {
    const user = auth.currentUser;
    if (!user) return alert("Must be logged in.");
    
    setIsStockSubmitting(true);
    const result = await adjustStock(
       id, 
       stockModalConfig.item.id, 
       amount, 
       stockModalConfig.type, 
       note, 
       user.uid
    );
    setIsStockSubmitting(false);

    if (result.success) {
      setStockModalConfig({ ...stockModalConfig, isOpen: false });
    } else {
      alert(result.error);
    }
  };

  const handleShare = async () => {
    if (items.length === 0) return alert('No items to export.');
    setIsSharing(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // ══ BRAND LETTERHEAD HEADER ══
      // Full-width dark blue background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 48, 'F');

      // Accent accent line at very top
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(0, 0, pageWidth, 3, 'F');

      // Brand Name - large, centered
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('NOOR CREATION', pageWidth / 2, 16, { align: 'center' });

      // Tagline
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Premium Stock Management', pageWidth / 2, 22, { align: 'center' });

      // Divider line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.line(14, 26, pageWidth - 14, 26);

      // Contact row — three evenly spaced columns
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300

      // Mobile
      doc.setFont('helvetica', 'bold');
      doc.text('MOB', 14, 32);
      doc.setFont('helvetica', 'normal');
      doc.text('+91 9993309902', 14, 37);

      // Email (center)
      doc.setFont('helvetica', 'bold');
      doc.text('EMAIL', pageWidth / 2, 32, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('noorcreation@gmail.com', pageWidth / 2, 37, { align: 'center' });

      // Address (right)
      doc.setFont('helvetica', 'bold');
      doc.text('ADDRESS', pageWidth - 14, 32, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('Burhanpur, Madhya Pradesh, India', pageWidth - 14, 37, { align: 'right' });

      // Bottom accent line
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 45, pageWidth, 3, 'F');

      // ══ CATEGORY SECTION ══
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(0, 48, pageWidth, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(`${category?.name || 'Category'} — Stock Report`, 14, 57);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth - 14, 57, { align: 'right' }
      );

      // ── Summary bar ──
      doc.setFillColor(255, 255, 255);
      const totalItems = items.length;
      const outOfStock = items.filter(i => i.status === 'out').length;
      const lowStock = items.filter(i => i.status === 'low').length;
      const inStock = totalItems - outOfStock - lowStock;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Total: ${totalItems}   ·   In Stock: ${inStock}   ·   Low Stock: ${lowStock}   ·   Out of Stock: ${outOfStock}`,
        14, 71
      );

      // ── Items Table ──
      autoTable(doc, {
        startY: 76,

        head: [['#', 'Item Name', 'SKU', 'Stock Qty', 'Min Level', 'Status']],
        body: items.map((item, idx) => [
          idx + 1,
          item.name,
          item.sku ? `#${item.sku}` : '—',
          `${item.quantity} ${item.unit || ''}`.trim(),
          item.minStockLevel ?? '—',
          item.status === 'out' ? 'Out of Stock' : item.status === 'low' ? 'Low Stock' : 'In Stock'
        ]),
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' }
        },
        didParseCell(data) {
          // Colour-code the Status column
          if (data.column.index === 5 && data.section === 'body') {
            const val = data.cell.raw;
            if (val === 'Out of Stock') data.cell.styles.textColor = [239, 68, 68];
            else if (val === 'Low Stock') data.cell.styles.textColor = [245, 158, 11];
            else data.cell.styles.textColor = [16, 185, 129];
          }
        },
        margin: { left: 14, right: 14 }
      });

      // ── Footer on each page ──
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(220, 220, 220);
        doc.line(14, doc.internal.pageSize.getHeight() - 12, pageWidth - 14, doc.internal.pageSize.getHeight() - 12);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Noor Creation — Stock Management', 14, doc.internal.pageSize.getHeight() - 7);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
      }

      // ── Share or Download ──
      const fileName = `${category?.name || 'Category'}_stock_${Date.now()}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `${category?.name} Stock List`,
          text: 'Current stock list from Noor Creation'
        });
      } else {
        // Fallback: trigger download
        doc.save(fileName);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="dashboard-layout">
      {/* Detail Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-brand" style={{cursor: 'pointer'}} onClick={() => navigate('/dashboard')}>
           <button className="btn-icon">
            <ArrowLeft size={20} />
          </button>
          <h1>Dashboard</h1>
        </div>
        
        <div className="header-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={`Search within ${category?.name || 'category'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-actions">
           {category && (
              <div className="cat-badge" style={{backgroundColor: `${category.color}20`, color: category.color}}>
                {category.name}
              </div>
           )}
           <button 
             className={`btn-icon share-btn ${isSharing ? 'loading' : ''}`} 
             onClick={handleShare}
             disabled={isSharing}
             title="Share as PDF"
           >
             <Share2 size={20} />
           </button>
        </div>
      </header>

      <main className="dashboard-content cat-detail-content fade-in-up">
        <div className="page-header">
          <div>
            <h2 className="greeting">{category?.name} Inventory</h2>
            <p className="subtitle">Manage items, update stock, and track usage.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-add-item">
            <Plus size={18} />
            <span>Add New Item</span>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="category-tabs glass-panel">
          <button 
            className={`cat-tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <Box size={18} />
            <span>Items ({items.length})</span>
          </button>
          <button 
            className={`cat-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <History size={18} />
            <span>Stock Activity</span>
          </button>
        </div>

        <div className="items-container glass-panel">
          {activeTab === 'items' ? (
            items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <Box size={40} />
              </div>
              <h3>No items found</h3>
              <p>Get started by adding your first item to this category.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-secondary" style={{marginTop: 16}}>
                Add First Item
              </button>
            </div>
          ) : (
             <div className="items-table-wrapper">
               <table className="items-table">
                 <thead>
                   <tr>
                     <th>Item Name & SKU</th>
                     <th>Status</th>
                     <th>Stock Quantity</th>
                     <th className="hide-on-mobile">Min Level</th>
                     <th className="text-right hide-on-mobile">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredItems.map(item => (
                     <React.Fragment key={item.id}>
                       <tr className={`item-row ${expandedItemId === item.id ? 'expanded' : ''}`} onClick={() => window.innerWidth <= 768 && setExpandedItemId(prev => prev === item.id ? null : item.id)}>
                         <td>
                           <div className="item-name-cell">
                             <span className="item-name">{item.name}</span>
                             {item.sku && <span className="item-sku">#{item.sku}</span>}
                           </div>
                         </td>
                         <td>
                           {item.status !== 'optimal' ? (
                             <div className={`status-badge ${item.status}`}>
                               {item.status === 'out' ? <AlertCircle size={12} /> : <TrendingDown size={12} />}
                               {item.status === 'out' ? 'Out of Stock' : 'Low Stock'}
                             </div>
                           ) : (
                             <div className="status-badge optimal">In Stock</div>
                           )}
                         </td>
                         <td>
                           <span className="qty-highlight">{item.quantity}</span> <span className="unit-label">{item.unit}</span>
                         </td>
                         <td className="hide-on-mobile">{item.minStockLevel}</td>
                         <td className="text-right table-actions hide-on-mobile">
                           <button onClick={(e) => { e.stopPropagation(); openStockModal(item, 'add'); }} className="btn-icon action-btn success-btn" title="Add Stock">
                             <Plus size={16} />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); openStockModal(item, 'use'); }} className="btn-icon action-btn warning-btn" title="Use Stock">
                             <Minus size={16} />
                           </button>
                           <div className="divider-vertical"></div>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="btn-icon action-btn delete" title="Delete">
                             <Trash2 size={16} />
                           </button>
                         </td>
                       </tr>
                       {expandedItemId === item.id && (
                         <tr className="mobile-expanded-row">
                           <td colSpan="3">
                             <div className="mobile-actions-container">
                               <button onClick={(e) => { e.stopPropagation(); openStockModal(item, 'add'); }} className="action-btn success-btn">
                                 <Plus size={16} /> Add
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); openStockModal(item, 'use'); }} className="action-btn warning-btn">
                                 <Minus size={16} /> Use
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="action-btn delete">
                                 <Trash2 size={16} /> Delete
                               </button>
                             </div>
                           </td>
                         </tr>
                       )}
                     </React.Fragment>
                   ))}
                 </tbody>
               </table>
             </div>
          )
          ) : (
            /* Activity Log View */
            <div className="cat-activity-log">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <Clock size={40} />
                  </div>
                  <h3>No activity yet</h3>
                  <p>Changes to stock levels in this category will appear here.</p>
                </div>
              ) : (
                <div className="activity-table-wrapper">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Action</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th className="hide-on-mobile">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="activity-date-cell">
                            {formatDate(tx.createdAt)}
                          </td>
                          <td>
                            <span className={`activity-badge ${tx.operationType}`}>
                              {tx.operationType === 'add' ? 'Received' : 'Consumed'}
                            </span>
                          </td>
                          <td className="activity-item-name">
                             {tx.itemName || 'Unnamed Item'}
                          </td>
                          <td className="activity-qty-cell">
                            <span className={`qty-value ${tx.operationType}`}>
                              {tx.operationType === 'add' ? '+' : '-'}{tx.amount}
                            </span>
                            <span className="unit-label">{tx.unit}</span>
                          </td>
                          <td className="activity-note-cell hide-on-mobile">
                            {tx.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ItemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddItem}
        isSubmitting={isSubmitting}
      />

      <StockModal
        isOpen={stockModalConfig.isOpen}
        item={stockModalConfig.item}
        type={stockModalConfig.type}
        onClose={() => setStockModalConfig({ ...stockModalConfig, isOpen: false })}
        onSubmit={handleStockSubmit}
        isSubmitting={isStockSubmitting}
      />

    </div>
  );
};

export default CategoryDetail;
