import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Activity,
  Users,
  ShieldCheck,
  Heart,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './Dashboard.css';
import RiderDashboard from './RiderDashboard';

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

const riderIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [donorDeliveries, setDonorDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);
  const [donationAmount, setDonationAmount] = useState(100);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    old_password: '',
    password: ''
  });
  const { refreshUser } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [requestsRes, donationsRes, donorDeliveriesRes] = await Promise.all([
        user.role === 'individual' ? axios.get(`${API_BASE_URL}/api/requests/my`, { headers }) : Promise.resolve({ data: [] }),
        user.role === 'individual' 
          ? axios.get(`${API_BASE_URL}/api/donations/my`, { headers })
          : Promise.resolve({ data: [] }),
        user.role === 'individual'
          ? axios.get(`${API_BASE_URL}/api/deliveries/donor`, { headers })
          : Promise.resolve({ data: [] })
      ]);

      setData(requestsRes.data);
      setMyDonations(donationsRes.data);
      setDonorDeliveries(donorDeliveriesRes.data);

      // Check if any request is completed to show monetary donation prompt to receiver
      if (user.role === 'individual') {
        const hasCompleted = requestsRes.data.some(r => r.status === 'completed');
        if (hasCompleted) {
          setShowDonationPrompt(true);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/requests/${requestId}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/deliveries/${deliveryId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update delivery status');
    }
  };

  const handleMonetaryDonation = async () => {
    try {
      const token = localStorage.getItem('token');
      // Create order for the selected amount
      const res = await axios.post(`${API_BASE_URL}/api/payments/create-order`, 
        { amount: donationAmount * 100, currency: "INR" }, // amount in paise
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const options = {
          "key": import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_default",
          "amount": res.data.amount,
          "currency": res.data.currency,
          "name": "MealMitra Foundation",
          "description": "Donation for platform operations",
          "order_id": res.data.id,
          "handler": async function (response){
              try {
                   await axios.post(`${API_BASE_URL}/api/payments/verify`, {
                       razorpay_payment_id: response.razorpay_payment_id,
                       razorpay_order_id: response.razorpay_order_id,
                       razorpay_signature: response.razorpay_signature || "mock_signature",
                       amount: donationAmount
                   }, { headers: { Authorization: `Bearer ${token}` } });
                  alert("Payment Successful! Transaction ID: " + response.razorpay_payment_id);
                  setShowDonationPrompt(false);
                  refreshUser(); // Refresh user data to update badges and stats
              } catch (err) {
                  alert("Payment verification failed");
              }
          },
          "prefill": {
              "name": user.name,
              "email": user.email,
              "contact": user.phone_number || "9999999999"
          },
          "theme": {
              "color": "#00f291"
          }
      };
      
      if (window.Razorpay && options.key !== "rzp_test_default") {
         const rzp1 = new window.Razorpay(options);
         rzp1.on('payment.failed', function (response){
                 alert("Payment Failed! Reason: " + response.error.description);
         });
         rzp1.open();
      } else {
         // Mock checkout for dev if SDK fails to load or test key is used
         alert("Simulating Razorpay Payment (No real API keys configured)...");
         try {
             await axios.post(`${API_BASE_URL}/api/payments/verify`, {
                 razorpay_payment_id: "pay_mock_" + Math.floor(Math.random()*1000000),
                 razorpay_order_id: res.data.id,
                 razorpay_signature: "mock_signature",
                 amount: donationAmount
             }, { headers: { Authorization: `Bearer ${token}` } });
             alert("Mock Payment Successful! Your payment has been simulated.");
             setShowDonationPrompt(false);
             refreshUser(); // Refresh user data to update badges and stats
         } catch (err) {
             alert("Mock Payment verification failed");
         }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initialize payment");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/users/me`, 
        { 
          name: profileForm.name,
          email: profileForm.email,
          phone_number: profileForm.phone_number,
          old_password: profileForm.old_password || undefined,
          password: profileForm.password || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Profile updated successfully!');
      setShowProfileModal(false);
      refreshUser();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  if (loading) return (
    <div className="container loading-state">
      <Activity size={48} className="animate-spin primary-icon" />
      <p>{t('donations.loading')}</p>
    </div>
  );

  return (
    <div className="container dashboard fade-in">
      <header className="dashboard-header card">
        <div className="header-info">
          <div className="user-avatar">
            <Users size={32} />
          </div>
          <div className="user-text">
            <h1>{t('dashboard.welcome')}, {user.name}</h1>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <p className="role-text">
                <ShieldCheck size={16} /> 
                {user.role === 'individual' ? "Individual (Donor/Receiver)" : "Volunteer (Rider)"}
              </p>
                <button 
                className="btn-glass small" 
                onClick={() => {
                  setProfileForm({
                    name: user.name,
                    email: user.email,
                    phone_number: user.phone_number || '',
                    old_password: '',
                    password: ''
                  });
                  setShowProfileModal(true);
                }}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginTop: '0.3rem' }}
              >
                Edit Profile
              </button>
               {user.role === 'individual' && user.donation_count > 0 && (
                <div className="donor-badge" style={{ padding: '0.3rem 0.8rem' }}>
                   <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {user.donation_count >= 201 ? "💎 Diamond Donor" : 
                     user.donation_count >= 101 ? "🏆 Champion Donor" : 
                     user.donation_count >= 61 ? "🥇 Gold Donor" : 
                     user.donation_count >= 31 ? "🥈 Silver Donor" : 
                     user.donation_count >= 16 ? "🥉 Bronze Donor" : 
                     user.donation_count >= 6 ? "🌟 Star Donor" : "🎗️ Supporter"}
                   </span>
                </div>
              )}
              {user.role === 'individual' && user.total_monetary_donated > 0 && (
                <div className="donor-badge" style={{ padding: '0.3rem 0.8rem', background: 'linear-gradient(45deg, #00f291, #00d4ff)', border: 'none', color: '#000' }}>
                   <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    {user.total_monetary_donated >= 25000 ? "❤️ Community Helper" : 
                     user.total_monetary_donated >= 10000 ? "💵 Giving Starter" : 
                     user.total_monetary_donated >= 5000 ? "🤝 Hope Contributor" : 
                     user.total_monetary_donated >= 1000 ? "🌟 Kind Donor" : "💚 First Supporter"}
                   </span>
                </div>
              )}
              {user.role === 'volunteer' && user.delivery_count > 0 && (
                <div className="donor-badge" style={{ padding: '0.3rem 0.8rem', background: 'rgba(var(--secondary-rgb), 0.2)', border: '1px solid var(--secondary)' }}>
                   <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {user.delivery_count >= 201 ? "💎 Diamond Rider" : 
                     user.delivery_count >= 101 ? "🏆 Champion Rider" : 
                     user.delivery_count >= 61 ? "🥇 Gold Rider" : 
                     user.delivery_count >= 31 ? "🥈 Silver Rider" : 
                     user.delivery_count >= 16 ? "🥉 Bronze Rider" : 
                     user.delivery_count >= 6 ? "🌟 Star Rider" : "🎗️ Hero Rider"}
                   </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="header-stats">
          <div className="quick-stat">
            <TrendingUp size={20} className="primary-icon" />
            <div className="stat-value">
              <strong>{user.role === 'individual' ? myDonations.length : user.delivery_count}</strong>
              <span>{user.role === 'individual' ? t('dashboard.totalPosted') : 'Total Deliveries'}</span>
            </div>
          </div>
          {user.role === 'individual' && user.total_monetary_donated > 0 && (
            <div className="quick-stat">
              <Heart size={20} style={{ color: '#00f291' }} />
              <div className="stat-value">
                <strong>₹{user.total_monetary_donated}</strong>
                <span>Total Donated</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {user.role === 'volunteer' ? (
        <RiderDashboard />
      ) : (
        <section className="dashboard-grid">
          <div className="active-section card">
            <div className="section-title">
              <Activity size={20} />
              <h2>Your Claimed Food</h2>
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
                  <p>{t('dashboard.noActivity')}</p>
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
                        <p className="message" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>"{request.message || t('donations.noMessage')}"</p>
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
                      {user.role === 'individual' && request.status === 'accepted' && (
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
                              <button 
                                onClick={() => updateDeliveryStatus(request.delivery.id, 'delivered')}
                                className="btn-primary small"
                                style={{ marginLeft: '10px' }}
                              >
                                Mark as Delivered
                              </button>
                            ) : (
                              <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Delivery Status: {request.delivery.status}
                              </span>
                            )
                          ) : (
                            <button 
                              onClick={() => updateRequestStatus(request.id, 'completed')}
                              className="btn-primary small"
                              style={{ marginLeft: '10px' }}
                            >
                              Mark as Received
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>

          {user.role === 'individual' && (
            <div className="my-posts card">
              <div className="section-title">
                <Package size={20} />
                <h2>{t('dashboard.yourDonations')}</h2>
              </div>
              <div className="posts-list">
                {myDonations.length === 0 ? (
                  <p className="empty-text">{t('dashboard.noDonations')}</p>
                ) : (
                  myDonations.map(donation => (
                    <div key={donation.id} className="post-item">
                      <div className="post-info">
                        {donation.image_url && (
                          <img src={donation.image_url} alt={donation.food_type} className="post-thumb" />
                        )}
                        <div className="post-text">
                          <strong>{donation.food_type}</strong>
                          <span>{donation.quantity}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`status-tag ${donation.status}`}>
                          {donation.status}
                        </span>
                        {donorDeliveries.find(d => d.request?.donation_id === donation.id && d.status === 'accepted') && (
                          <button 
                            onClick={() => updateDeliveryStatus(donorDeliveries.find(d => d.request?.donation_id === donation.id).id, 'picked_up')}
                            className="btn-primary small"
                          >
                            Mark Picked Up
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {user.role === 'individual' && showDonationPrompt && (
            <div className="card donation-prompt" style={{ gridColumn: 'span 2', textAlign: 'center', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--secondary-rgb), 0.1) 100%)', border: '1px solid rgba(var(--primary-rgb), 0.3)' }}>
              <Heart size={48} className="primary-icon" style={{ margin: '0 auto 1rem', display: 'block' }} />
              <h2 style={{ marginBottom: '0.5rem' }}>Support Our Mission</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>You recently received food through our platform! If you are willing and able, please consider making a small monetary donation to help support our NGOs, riders, and platform operations.</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[50, 100, 200, 500, 1000].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setDonationAmount(amt)}
                    className={`btn-glass small ${donationAmount === amt ? 'active' : ''}`}
                    style={{ background: donationAmount === amt ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: donationAmount === amt ? '#000' : '#fff' }}
                  >
                    ₹{amt}
                  </button>
                ))}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }}>₹</span>
                  <input 
                    type="number" 
                    value={donationAmount} 
                    onChange={(e) => setDonationAmount(Number(e.target.value))}
                    className="glass-input small"
                    style={{ width: '100px', paddingLeft: '25px', marginBottom: 0 }}
                    placeholder="Custom"
                  />
                </div>
              </div>
              
              <button className="btn-primary" onClick={handleMonetaryDonation}>Donate ₹{donationAmount} Now</button>
            </div>
          )}
        </section>
      )}

      {trackingRequest && (
        <div className="modal-overlay" onClick={() => setTrackingRequest(null)}>
          <div className="modal-content card tracking-modal" onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', border: '1px solid var(--primary)' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={24} style={{ color: 'var(--primary)' }} />
                <h2 style={{ color: '#fff' }}>Tracking Delivery #{trackingRequest.id}</h2>
              </div>
              <button className="close-btn" onClick={() => setTrackingRequest(null)} style={{ color: '#fff' }}>&times;</button>
            </div>
            <div className="tracking-info-bar" style={{ background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)', padding: '1.2rem' }}>
               <p style={{ color: '#fff' }}><strong>Volunteer:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{trackingRequest.delivery?.rider?.name || "Assigning..."}</span></p>
               <p style={{ color: '#fff' }}><strong>Status:</strong> <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{trackingRequest.delivery?.status || "Pending"}</span></p>
            </div>
            <div className="map-container" style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <MapContainer 
                center={[trackingRequest.delivery_lat || 12.9716, trackingRequest.delivery_lng || 77.5946]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Destination */}
                {trackingRequest.delivery_lat && (
                  <Marker position={[trackingRequest.delivery_lat, trackingRequest.delivery_lng]}>
                    <Popup>Delivery Destination</Popup>
                  </Marker>
                )}

                {/* Volunteer Location */}
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
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', position: 'relative' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Edit Profile</h2>
              <button type="button" className="close-btn" onClick={() => setShowProfileModal(false)} style={{ fontSize: '2rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', position: 'absolute', top: '15px', right: '15px', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  className="glass-input" 
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({...profileForm, phone_number: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Old Password</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  value={profileForm.old_password}
                  onChange={(e) => setProfileForm({...profileForm, old_password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                />
              </div>
              <button type="submit" className="btn-primary full-width" style={{ marginTop: '1rem' }}>
                Update Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
