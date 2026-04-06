import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, TrendingDown, History, Package, Clock, CornerDownRight } from 'lucide-react';
import { auth } from '../firebase/config';
import { subscribeToAlerts, subscribeToTransactions } from '../firebase/db';
import './Alerts.css';

const Alerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/auth');
      return;
    }

    const unsubAlerts = subscribeToAlerts(user.uid, (data) => {
      setAlerts(data);
      setIsLoading(false);
    });

    const unsubTransactions = subscribeToTransactions(user.uid, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubAlerts();
      unsubTransactions();
    };
  }, [navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="alerts-layout">
      {/* Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <button className="btn-icon">
            <ArrowLeft size={20} />
          </button>
          <h1>Alerts & Reports</h1>
        </div>
      </header>

      <main className="dashboard-content alerts-content fade-in-up">
        {/* Tab Navigation */}
        <div className="tab-control glass-panel">
          <button 
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} 
            onClick={() => setActiveTab('alerts')}
          >
            <AlertCircle size={18} />
            <span>Stock Alerts</span>
            {alerts.length > 0 && <span className="tab-badge-pill">{alerts.length}</span>}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} 
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            <span>Activity Log</span>
          </button>
        </div>

        {activeTab === 'alerts' ? (
          <section className="alerts-section">
            {alerts.length === 0 ? (
              <div className="empty-state-card glass-panel">
                <div className="success-icon-wrapper">
                  <Package size={32} />
                </div>
                <h3>All Stock is Healthy</h3>
                <p>No items are currently below their minimum stock levels.</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map(item => (
                  <div 
                    key={item.id} 
                    className={`alert-card glass-panel ${item.status}`}
                    onClick={() => navigate(`/category/${item.categoryId}`)}
                  >
                    <div className="alert-card-icon">
                      {item.status === 'out' ? <AlertCircle size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div className="alert-card-info">
                      <div className="alert-card-title">
                        <h4>{item.name}</h4>
                        <span className="alert-category" style={{ color: item.categoryColor }}>
                          {item.categoryName}
                        </span>
                      </div>
                      <div className="alert-card-stats">
                        <span className="alert-qty">
                          Current: <strong>{item.quantity} {item.unit}</strong>
                        </span>
                        <span className="alert-min">
                          Min Level: {item.minStockLevel}
                        </span>
                      </div>
                    </div>
                    <div className="alert-card-arrow">
                      <CornerDownRight size={20} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="history-section">
            {transactions.length === 0 ? (
              <div className="empty-state-card glass-panel">
                <div className="empty-icon-wrapper">
                  <Clock size={32} />
                </div>
                <h3>No History Yet</h3>
                <p>When you add or use stock, transactions will appear here.</p>
              </div>
            ) : (
              <div className="history-timeline glass-panel">
                {transactions.map((tx, idx) => (
                  <div key={tx.id} className="history-item">
                    <div className="history-marker">
                      <div className={`marker-dot ${tx.operationType}`}></div>
                      {idx < transactions.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="history-content">
                      <div className="history-top">
                        <span className="history-time">{formatDate(tx.createdAt)}</span>
                        <span className={`history-op-badge ${tx.operationType}`}>
                          {tx.operationType === 'add' ? '+ Received' : '- Consumed'}
                        </span>
                      </div>
                      <div className="history-details">
                        <p className="history-text">
                          <strong>{tx.amount} units</strong> {tx.operationType === 'add' ? 'added to' : 'used from'} <strong>Item ID: {tx.itemId}</strong>
                        </p>
                        {tx.note && <p className="history-note">"{tx.note}"</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Alerts;
