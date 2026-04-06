import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, ShieldCheck } from 'lucide-react';
import './Splash.css';

const Splash = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="splash-container">
      <div className={`splash-content ${isVisible ? 'fade-in' : ''}`}>
        <div className="logo-container">
          <div className="logo-circle">
            <Package size={48} className="logo-icon" />
          </div>
          <h1 className="brand-title">Noor Stock<br/>Management</h1>
          <p className="brand-subtitle">Clarity in every item. Growth in every step.</p>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <TrendingUp size={24} className="feature-icon" />
            <span>Real-time Tracking</span>
          </div>
          <div className="feature-item">
            <ShieldCheck size={24} className="feature-icon" />
            <span>Secure & Reliable</span>
          </div>
        </div>

        <button 
          className="btn btn-primary get-started-btn"
          onClick={() => navigate('/auth')}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Splash;
