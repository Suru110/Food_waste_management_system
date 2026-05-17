import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, MapPin, CheckCircle2, Navigation, Clock, Search, Map as MapIcon } from 'lucide-react';

// Fix for default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Component to change map view
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const RiderDashboard = () => {
  const { t } = useTranslation();
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [otpInputs, setOtpInputs] = useState({});
  const [otpGenerated, setOtpGenerated] = useState({});
  const { refreshUser } = useAuth();

  const center = { lat: 12.9716, lng: 77.5946 };

  useEffect(() => {
    fetchData();
    trackUserLocation();
    
    // Auto refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const trackUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.error("Geolocation failed"),
        { enableHighAccuracy: true }
      );
    }
  };
  
  const updateLocationOnServer = async (pos) => {
    if (!pos) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/users/location?lat=${pos.lat}&lng=${pos.lng}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to update location on server", err);
    }
  };

  useEffect(() => {
    if (userLocation) {
      updateLocationOnServer(userLocation);
      const interval = setInterval(() => {
        updateLocationOnServer(userLocation);
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [userLocation]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [availableRes, myRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/deliveries/available`, { headers }),
        axios.get(`${API_BASE_URL}/api/deliveries/my`, { headers })
      ]);

      setAvailableDeliveries(availableRes.data);
      setMyDeliveries(myRes.data);
      refreshUser(); // Update the delivery count in the header
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (deliveryId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/deliveries/${deliveryId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to accept delivery');
    }
  };

  const handleUpdateStatus = async (deliveryId, newStatus, otp = null) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/deliveries/${deliveryId}/status`, { status: newStatus, otp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleGenerateOtp = async (deliveryId, type) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/deliveries/${deliveryId}/generate-${type}-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOtpGenerated({...otpGenerated, [`${deliveryId}-${type}`]: true});
      alert('OTP Generated and sent via SMS!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate OTP');
    }
  };

  const handleOtpChange = (deliveryId, value) => {
    setOtpInputs({...otpInputs, [deliveryId]: value});
  };

  if (loading) return (
    <div className="container loading-state">
      <Activity size={48} className="animate-spin primary-icon" />
      <p>Loading deliveries...</p>
    </div>
  );

  return (
    <div className="dashboard-grid">
      <div className="active-section card" style={{ gridColumn: 'span 2' }}>
        <div className="section-title">
          <MapIcon size={20} />
          <h2>Available Deliveries</h2>
        </div>
        <div className="map-container" style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <MapContainer 
              center={userLocation ? [userLocation.lat, userLocation.lng] : [center.lat, center.lng]} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeView center={userLocation ? [userLocation.lat, userLocation.lng] : [center.lat, center.lng]} zoom={13} />
              
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}

              {/* Available Jobs */}
              {availableDeliveries.map(delivery => (
                delivery.request?.donation && (
                  <Marker 
                    key={`available-${delivery.id}`} 
                    position={[delivery.request.donation.location_lat, delivery.request.donation.location_lng]}
                  >
                    <Popup>
                      <div className="info-window">
                        <h4>{delivery.request.donation.food_type}</h4>
                        <p>Quantity: {delivery.request.donation.quantity}</p>
                        <button className="btn-primary small" onClick={() => handleAccept(delivery.id)} style={{ width: '100%', marginTop: '0.5rem' }}>
                          Accept Job
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* My Active Jobs */}
              {myDeliveries.filter(d => d.status !== 'delivered').map(delivery => (
                delivery.request?.donation && (
                  <Marker 
                    key={`active-${delivery.id}`} 
                    position={[delivery.request.donation.location_lat, delivery.request.donation.location_lng]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                      shadowUrl: markerShadow,
                      iconSize: [25, 41],
                      iconAnchor: [12, 41]
                    })}
                  >
                    <Popup>
                      <div className="info-window">
                        <h4>Active: {delivery.request.donation.food_type}</h4>
                        <p>Status: {delivery.status}</p>
                        <p>Quantity: {delivery.request.donation.quantity}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
        </div>

        <div className="request-feed" style={{ marginTop: '1rem' }}>
          {availableDeliveries.length === 0 ? (
            <p className="padding">No pending deliveries right now.</p>
          ) : (
            availableDeliveries.map(delivery => (
              <div key={delivery.id} className="feed-item">
                <div className="item-main" style={{ alignItems: 'flex-start', width: '100%' }}>
                  <Navigation className="primary-icon" style={{ marginTop: '5px' }} />
                  <div className="item-details" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                        {delivery.request?.donation?.food_type || `Delivery Job #${delivery.id}`}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(delivery.created_at || new Date()).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--warning)' }}>
                      <strong>Donor:</strong> {delivery.request?.donation?.donor?.name || 'Unknown'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--success)' }}>🟢 Pickup:</span>
                        <span>{delivery.request?.donation?.address || 'Pickup Location'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--danger)' }}>📍 Dropoff:</span>
                        <span>{delivery.request?.delivery_address || 'Dropoff Location'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="btn-primary small" onClick={() => handleAccept(delivery.id)}>
                  Accept Job
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="my-posts card" style={{ gridColumn: 'span 2' }}>
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <CheckCircle2 size={20} />
            <h2>{showHistory ? 'My Delivery History' : 'My Active Deliveries'}</h2>
          </div>
          <button 
            className="btn-glass small" 
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'View Active' : 'View History'}
          </button>
        </div>
        <div className="posts-list">
          {myDeliveries.filter(d => showHistory ? d.status === 'delivered' : d.status !== 'delivered').length === 0 ? (
             <p className="empty-text">{showHistory ? 'You have no completed deliveries yet.' : 'You have no active deliveries.'}</p>
          ) : (
            myDeliveries.filter(d => showHistory ? d.status === 'delivered' : d.status !== 'delivered').map(delivery => (
              <div key={delivery.id} className="feed-item" style={showHistory ? { opacity: 0.8 } : {}}>
                <div className="item-main" style={{ alignItems: 'flex-start', width: '100%' }}>
                  <div className="item-details" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                        {delivery.request?.donation?.food_type || `Delivery Job #${delivery.id}`}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(delivery.created_at || new Date()).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--warning)' }}>
                      <strong>Donor:</strong> {delivery.request?.donation?.donor?.name || 'Unknown'}
                    </p>
                    <p style={{ marginBottom: '0.5rem' }}>Current Status: <strong style={{ color: 'var(--primary)' }}>{delivery.status.toUpperCase()}</strong></p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--success)' }}>🟢 Pickup:</span>
                        <span>{delivery.request?.donation?.address || 'Pickup Location'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--danger)' }}>📍 Dropoff:</span>
                        <span>{delivery.request?.delivery_address || 'Dropoff Location'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="action-btns">
                  {delivery.status === 'accepted' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {!otpGenerated[`${delivery.id}-pickup`] ? (
                        <button 
                          className="btn-primary small" 
                          onClick={() => handleGenerateOtp(delivery.id, 'pickup')}
                        >
                          Generate Pickup OTP
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Enter Pickup OTP" 
                            className="glass-input small" 
                            style={{ marginBottom: 0, width: '150px' }}
                            value={otpInputs[delivery.id] || ''}
                            onChange={(e) => handleOtpChange(delivery.id, e.target.value)}
                          />
                          <button 
                            className="btn-primary small" 
                            onClick={() => handleUpdateStatus(delivery.id, 'picked_up', otpInputs[delivery.id])}
                          >
                            Verify Pickup
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {delivery.status === 'picked_up' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {!otpGenerated[`${delivery.id}-delivery`] ? (
                        <button 
                          className="btn-primary small" 
                          onClick={() => handleGenerateOtp(delivery.id, 'delivery')}
                        >
                          Generate Delivery OTP
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Enter Delivery OTP" 
                            className="glass-input small" 
                            style={{ marginBottom: 0, width: '150px' }}
                            value={otpInputs[delivery.id] || ''}
                            onChange={(e) => handleOtpChange(delivery.id, e.target.value)}
                          />
                          <button 
                            className="btn-primary small" 
                            onClick={() => handleUpdateStatus(delivery.id, 'delivered', otpInputs[delivery.id])}
                          >
                            Verify Delivery
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
