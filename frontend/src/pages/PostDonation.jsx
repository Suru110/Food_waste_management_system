import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, MapPin, Package, Clock, Info, Search, Image as ImageIcon } from 'lucide-react';
import './PostDonation.css';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const center = {
  lat: 12.9716,
  lng: 77.5946
};

// Component to handle map clicks
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

// Component to change map view
const ChangeView = ({ center, zoom }) => {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const PostDonation = () => {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    food_type: '',
    quantity: '',
    description: '',
    expiry_time: '',
    image_url: '',
    location_lat: center.lat,
    location_lng: center.lng,
    address: ''
  });
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const navigate = useNavigate();

  const handleMapClick = (latlng) => {
    setFormData({
      ...formData,
      location_lat: latlng.lat,
      location_lng: latlng.lng
    });
  };

  const searchAddress = async () => {
    if (!addressSearch) return;
    setSearchingAddress(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching address:", error);
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectAddress = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setFormData({
      ...formData,
      location_lat: lat,
      location_lng: lng,
      address: result.display_name
    });
    setAddressSearch(result.display_name);
    setSearchResults([]);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Error: The Geolocation service failed. Please check your browser permissions or use the search bar.");
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate expiry time
    const expiryDate = new Date(formData.expiry_time);
    const now = new Date();
    if (expiryDate <= now) {
      alert("Expiry date and time must be in the future.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/donations/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshUser();
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to post donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container post-donation fade-in">
      <motion.div 
        className="form-card card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="form-header">
          <PlusCircle size={32} className="primary-icon" />
          <h1>{t('nav.donateFood')}</h1>
          <p className="subtitle">{t('home.heroSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="donation-form">
          <div className="form-grid">
            <div className="form-group">
              <label><Package size={16} /> {t('donations.foodType')}</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="e.g. Mixed Vegetables, Pasta"
                value={formData.food_type}
                onChange={(e) => setFormData({...formData, food_type: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label><PlusCircle size={16} /> {t('donations.quantity')}</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="e.g. 5kg, 10 meals"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label><Info size={16} /> {t('donations.description')}</label>
            <textarea 
              className="glass-input" 
              rows="3"
              placeholder="Tell us more about the food..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <div className="form-group">
            <label><PlusCircle size={16} /> {t('donations.imageUrl')}</label>
            <input 
              type="url" 
              className="glass-input" 
              placeholder="https://example.com/image.jpg"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label><Clock size={16} /> {t('donations.expires')}</label>
            <input 
              type="datetime-local" 
              className="glass-input" 
              value={formData.expiry_time}
              onChange={(e) => setFormData({...formData, expiry_time: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label><MapPin size={16} /> {t('nav.findFood')}</label>
            <div className="location-actions">
              <div className="search-container" style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search for an address"
                    className="glass-input"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                  />
                  <button type="button" className="btn-primary small" onClick={searchAddress} disabled={searchingAddress}>
                    <Search size={18} />
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="search-results-dropdown card" style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 1000, 
                    padding: '0.5rem', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    borderRadius: '12px',
                    marginTop: '5px'
                  }}>
                    {searchResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="search-result-item" 
                        onClick={() => selectAddress(result)}
                        style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                      >
                        {result.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                className="btn-primary small use-location-btn" 
                onClick={getUserLocation}
                style={{ marginBottom: '10px', width: '100%' }}
              >
                📍 Use My Current Location
              </button>
            </div>
            <div className="map-container" style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
              <MapContainer 
                center={[formData.location_lat, formData.location_lng]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={[formData.location_lat, formData.location_lng]} zoom={14} />
                <LocationMarker 
                  position={{ lat: formData.location_lat, lng: formData.location_lng }} 
                  setPosition={handleMapClick} 
                />
              </MapContainer>
            </div>
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? t('donations.posting') : t('donations.postButton')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default PostDonation;
