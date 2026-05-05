import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, Zap, ShieldCheck, ArrowRight, Users, Package, Heart, Globe } from 'lucide-react';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-gradient-bg"></div>
        <div className="hero-grid-pattern"></div>
        
        <motion.div 
          className="container hero-content"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div 
            className="badge pulse-badge" 
            variants={itemVariants}
          >
            <span className="badge-dot"></span>
            {t('home.badge', 'REVOLUTIONIZING FOOD SHARING')}
          </motion.div>
          
          <motion.h1 variants={itemVariants}>
            Share Food, <br/>
            <span className="highlight-text">Save the Planet.</span>
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle" 
            variants={itemVariants}
          >
            Connect with your local community to donate surplus food, reduce waste, and ensure no one goes hungry. A smart, sustainable way to make an impact.
          </motion.p>
          
          <motion.div className="hero-cta" variants={itemVariants}>
            <Link to="/register" className="btn-primary-glow">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/donations" className="btn-outline-glass">
              Find Food
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="stats-section">
        <motion.div 
          className="container stats-container"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div className="stat-box" variants={itemVariants}>
            <div className="stat-icon-wrapper neon-green">
              <Package size={28} />
            </div>
            <div className="stat-info">
              <h3>5,000+</h3>
              <p>{t('home.stats.meals', 'Meals Shared')}</p>
            </div>
          </motion.div>
          <motion.div className="stat-box" variants={itemVariants}>
            <div className="stat-icon-wrapper neon-purple">
              <Users size={28} />
            </div>
            <div className="stat-info">
              <h3>1,200+</h3>
              <p>{t('home.stats.volunteers', 'Active Volunteers')}</p>
            </div>
          </motion.div>
          <motion.div className="stat-box" variants={itemVariants}>
            <div className="stat-icon-wrapper neon-blue">
              <Heart size={28} />
            </div>
            <div className="stat-info">
              <h3>850+</h3>
              <p>{t('home.stats.donors', 'Generous Donors')}</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="features-section container">
        <div className="section-header">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-heading"
          >
            Why Choose MealMitra?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="section-subtitle"
          >
            We leverage technology to create a seamless, efficient, and secure ecosystem for food redistribution.
          </motion.p>
        </div>
        
        <motion.div 
          className="features-grid-modern"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          <motion.div 
            className="modern-feature-card"
            variants={itemVariants}
            whileHover={{ y: -10 }}
          >
            <div className="feature-glow-bg"></div>
            <div className="feature-icon"><MapPin size={24} /></div>
            <h3>Location Based</h3>
            <p>Smart matching algorithms find the closest donors and receivers to minimize transit time and carbon footprint.</p>
          </motion.div>
          <motion.div 
            className="modern-feature-card"
            variants={itemVariants}
            whileHover={{ y: -10 }}
          >
            <div className="feature-glow-bg"></div>
            <div className="feature-icon"><Zap size={24} /></div>
            <h3>Instant Alerts</h3>
            <p>Real-time SMS and push notifications ensure volunteers are dispatched instantly when food becomes available.</p>
          </motion.div>
          <motion.div 
            className="modern-feature-card"
            variants={itemVariants}
            whileHover={{ y: -10 }}
          >
            <div className="feature-glow-bg"></div>
            <div className="feature-icon"><ShieldCheck size={24} /></div>
            <h3>Secure Platform</h3>
            <p>Verified user profiles and secure data handling keep the community safe, trustworthy, and reliable.</p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
