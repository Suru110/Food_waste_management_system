import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Calendar,
  Navigation
} from 'lucide-react';
import './Dashboard.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const riderIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const MyClaims = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);

  useEffect(() => {
    fetchClaims();
  }, [user]);

  const fetchClaims = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/requests/my`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="container loading-state" style={{ paddingTop: '5rem' }}>
      <Activity size={48} className="animate-spin primary-icon" />
      <p>Loading claims...</p>
    </div>
  );

  return (
    <div className="container dashboard fade-in" style={{ paddingTop: '5rem' }}>
      <div className="active-section card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="section-title">
          <Activity size={24} />
          <h2 style={{ fontSize: '1.5rem' }}>My Claims</h2>
        </div>
        
        <motion.div 
          className="request-feed"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {data.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>You haven't claimed any food yet.</p>
            </div>
          ) : (
            data.map(request => (
              <motion.div 
                key={request.id} 
                className="feed-item"
                variants={{
                  hidden: { x: -20, opacity: 0 },
                  visible: { x: 0, opacity: 1 }
                }}
                whileHover={{ scale: 1.02, x: 10 }}
              >
                <div className="item-main">
                  <div className="item-icon">
                    {request.status === 'accepted' ? <CheckCircle2 className="success" /> : 
                     request.status === 'rejected' ? <XCircle className="danger" /> : 
                     request.status === 'completed' ? <CheckCircle2 className="success" /> :
                     <Clock className="warning" />}
                  </div>
                  <div className="item-details" style={{ width: '100%' }}>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      {request.donation?.food_type || `Food Request #${request.donation_id}`}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      <div><strong>Donor:</strong> {request.donation?.donor?.name || 'Unknown'}</div>
                      <div><strong>Quantity:</strong> {request.donation?.quantity || 'N/A'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--success)' }}>🟢 From:</span>
                        <span>{request.donation?.address || 'Donor Location'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: 'var(--danger)' }}>📍 To:</span>
                        <span>{request.delivery_address || 'Your Location'}</span>
                      </div>
                    </div>
                    <p className="message" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>"{request.message || 'No message provided'}"</p>
                    <div className="item-meta" style={{ marginTop: '0.5rem' }}>
                      <Calendar size={12} />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="item-actions">
                  <span className={`status-pill ${request.status}`}>
                    {request.status}
                  </span>
                  {request.status === 'accepted' && (
                    <>
                      <button 
                        onClick={() => setTrackingRequest(request)}
                        className="btn-primary small"
                        style={{ marginLeft: '10px', background: 'var(--secondary)' }}
                      >
                        <Navigation size={14} /> Track
                      </button>
                      {request.delivery ? (
                        request.delivery.status === 'picked_up' ? (
                          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--success)' }}>
                            Waiting for rider to verify delivery...
                          </span>
                        ) : (
                          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Delivery Status: {request.delivery.status}
                          </span>
                        )
                      ) : (
                          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Waiting for rider assignment...
                          </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {trackingRequest && (
        <div className="modal-overlay" onClick={() => setTrackingRequest(null)}>
          <div className="modal-content card tracking-modal" onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', border: '1px solid var(--primary)' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={24} style={{ color: 'var(--primary)' }} />
                <h2 style={{ color: 'var(--warning)' }}>Tracking Delivery #{trackingRequest.id}</h2>
              </div>
              <button className="close-btn" onClick={() => setTrackingRequest(null)} style={{ color: 'var(--warning)' }}>&times;</button>
            </div>
            <div className="tracking-info-bar" style={{ background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)', padding: '1.2rem' }}>
               <p style={{ color: 'var(--warning)' }}><strong>Volunteer:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{trackingRequest.delivery?.rider?.name || "Assigning..."}</span></p>
               <p style={{ color: 'var(--warning)' }}><strong>Status:</strong> <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{trackingRequest.delivery?.status || "Pending"}</span></p>
            </div>
            <div className="map-container" style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <MapContainer 
                center={[trackingRequest.delivery_lat || 12.9716, trackingRequest.delivery_lng || 77.5946]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {trackingRequest.delivery_lat && (
                  <Marker position={[trackingRequest.delivery_lat, trackingRequest.delivery_lng]}>
                    <Popup>Delivery Destination</Popup>
                  </Marker>
                )}

                {trackingRequest.delivery?.rider?.current_lat && (
                  <Marker 
                    position={[trackingRequest.delivery.rider.current_lat, trackingRequest.delivery.rider.current_lng]}
                    icon={riderIcon}
                  >
                    <Popup>Volunteer is here</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <p className="tracking-tip" style={{ marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              The volunteer's location updates every 30 seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClaims;
