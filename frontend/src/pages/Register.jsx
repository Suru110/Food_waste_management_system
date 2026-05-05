import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { UserPlus, User, Mail, Lock, UserCheck, ArrowRight, Phone } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'individual'
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/login');
    } catch (err) {
      setError('Registration failed. Try again.');
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="icon-badge">
            <UserPlus size={24} />
          </div>
          <h2>{t('auth.register.title')}</h2>
          <p className="subtitle">{t('auth.register.subtitle')}</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={16} /> {t('auth.register.name')}</label>
            <input 
              type="text" 
              className="glass-input" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label><Mail size={16} /> {t('auth.register.email')}</label>
            <input 
              type="email" 
              className="glass-input" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label><UserCheck size={16} /> {t('auth.register.role')}</label>
            <select 
              className="glass-input"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="individual">Individual (Donate / Receive Food)</option>
              <option value="volunteer">Volunteer (Collect & Distribute)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label><Phone size={16} /> Phone Number</label>
            <input 
              type="tel" 
              className="glass-input" 
              placeholder="+1234567890"
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label><Lock size={16} /> {t('auth.register.password')}</label>
            <input 
              type="password" 
              className="glass-input" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn-primary full-width">
            {t('auth.register.submit')}
            <ArrowRight size={18} />
          </button>
        </form>
        
        <p className="auth-footer">
          {t('auth.register.hasAccount')} <Link to="/login">{t('auth.register.login')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
