import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, LayoutDashboard, Utensils, PlusCircle, ShieldCheck, Sun, Moon, Monitor, ClipboardList } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, cycleTheme } = useTheme();
  const [showLanguages, setShowLanguages] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'mr', name: 'मराठी' },
    { code: 'bn', name: 'বাংলা' }
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguages(false);
  };

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="logo">
          <Utensils size={28} />
          <span>MealMitra</span>
        </Link>
        
        <div className="nav-links">
          {(!user || user.role === 'individual') && (
            <Link to="/donations">{t('nav.findFood')}</Link>
          )}
          
          <div className="lang-switcher">
            <button className="lang-btn" onClick={() => setShowLanguages(!showLanguages)}>
              <Globe size={18} />
              <span>{languages.find(l => l.code === i18n.language.split('-')[0])?.name || 'English'}</span>
            </button>
            {showLanguages && (
              <div className="lang-dropdown card">
                {languages.map((lang) => (
                  <button 
                    key={lang.code} 
                    onClick={() => changeLanguage(lang.code)}
                    className={i18n.language === lang.code ? 'active' : ''}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="theme-toggle-btn" onClick={cycleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0.5rem' }}>
            {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <Monitor size={20} />}
          </button>

          {user ? (
            <>
              <Link to="/dashboard">
                <LayoutDashboard size={18} />
                {t('nav.dashboard')}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="admin-link">
                  <ShieldCheck size={18} />
                  {t('nav.admin')}
                </Link>
              )}
              {user.role === 'individual' && (
                <>
                  <Link to="/post-donation">
                    <PlusCircle size={18} />
                    {t('nav.donateFood')}
                  </Link>
                  <Link to="/my-claims">
                    <ClipboardList size={18} />
                    My Claims
                  </Link>
                </>
              )}
              <button onClick={() => { logout(); navigate('/'); }} className="btn-logout">
                <LogOut size={18} />
                {t('nav.logout')}
              </button>
              <Link to="/profile" className="user-profile">
                <span className="user-initial">{user.name[0]}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">{t('nav.login')}</Link>
              <Link to="/register">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
