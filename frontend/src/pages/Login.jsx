import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('Network Error: Cannot reach server. Please ensure you are on the same WiFi as the server computer.');
      } else {
        setError('Invalid email or password');
      }
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="icon-badge">
            <LogIn size={24} />
          </div>
          <h2>{t('auth.login.title')}</h2>
          <p className="subtitle">{t('auth.login.subtitle')}</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Mail size={16} /> {t('auth.login.email')}</label>
            <input 
              type="email" 
              className="glass-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label><Lock size={16} /> {t('auth.login.password')}</label>
            <input 
              type="password" 
              className="glass-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary full-width">
            {t('auth.login.submit')}
            <ArrowRight size={18} />
          </button>
        </form>
        
        <p className="auth-footer">
          {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.signup')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
