import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogOut, Search, Bell, TrendingDown, Layers, Box, AlertCircle, Plus, Trash2, FileText } from 'lucide-react';
import './Dashboard.css';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { subscribeToCategories, addCategory, deleteCategory } from '../firebase/db';
import CategoryModal from '../components/CategoryModal';
import BillModal from '../components/BillModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  
  // App State
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Auth & Data Subscription
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/auth');
      } else {
        setUser(currentUser);
        // Subscribe to user's categories
        const unsubscribeDb = subscribeToCategories(currentUser.uid, (data) => {
          setCategories(data);
          setIsLoading(false);
        });
        return () => unsubscribeDb();
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const handleCreateCategory = async (catData) => {
    if (!user) return;
    setIsSubmitting(true);
    const result = await addCategory(user.uid, catData);
    setIsSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert("Failed to create category: " + result.error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if(window.confirm("Are you sure you want to delete this category?")) {
      await deleteCategory(id);
    }
  };

  // Derived Stats
  const totalItems = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);
  const lowStockItems = categories.filter(cat => cat.status !== 'optimal').length;

  return (
    <div className="dashboard-layout">
      {/* Top Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-brand">
          <div className="logo-tiny">
            <Package size={20} color="#2563eb" />
          </div>
          <h1>Noor Stock</h1>
        </div>
        
        <div className="header-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search items or categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-actions">
          <button className="btn btn-primary btn-bill-header" onClick={() => setIsBillModalOpen(true)}>
             <FileText size={18} />
             <span>Create Bill</span>
          </button>
          <button className="btn-icon notification-btn" onClick={() => navigate('/alerts')}>
            <Bell size={20} />
            {lowStockItems > 0 && <span className="badge">{lowStockItems}</span>}
          </button>
          <div className="user-avatar">
            <span>{user?.email?.[0].toUpperCase() || 'A'}</span>
          </div>
          <button onClick={handleLogout} className="btn-icon logout-btn" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-content fade-in-up">
        

        {/* Categories Section */}
        <section className="categories-section">
          <div className="section-header">
            <h3>Your Categories</h3>
            <button className="btn-link">View All</button>
          </div>
          
          <div className="category-grid">
            {isLoading ? (
               <div className="loading-state">Loading categories...</div>
            ) : (
               categories.map(category => (
                <div key={category.id} onClick={() => navigate(`/category/${category.id}`)} className="category-card glass-panel">
                  <div className="category-card-header">
                    <div className="cat-icon" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                       <Layers size={24} />
                    </div>
                    <div className="cat-header-actions">
                      {category.status && category.status !== 'optimal' && (
                        <div className={`status-indicator ${category.status}`}>
                          {category.status === 'out' ? <AlertCircle size={14} /> : <TrendingDown size={14} />}
                          <span>{category.status === 'out' ? 'Out of Stock' : 'Low Stock'}</span>
                        </div>
                      )}
                      <button onClick={(e) => handleDelete(e, category.id)} className="delete-cat-btn" title="Delete Category">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="category-card-body">
                    <h4>{category.name}</h4>
                    <p>{category.count || 0} items</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Add New Category Card */}
            {!isLoading && (
              <div onClick={() => setIsModalOpen(true)} className="category-card add-new-card glass-panel">
                <div className="add-icon-wrapper">
                  <Plus size={32} />
                </div>
                <p>Create Category</p>
              </div>
            )}
          </div>
        </section>

      </main>

      <CategoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateCategory}
        isSubmitting={isSubmitting}
      />

      <BillModal 
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
