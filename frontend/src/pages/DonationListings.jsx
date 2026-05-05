import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { API_BASE_URL, translateTexts } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  MapPin, 
  Clock, 
  Calendar, 
  Navigation, 
  Info,
  Map as MapIcon,
  List as ListIcon
} from 'lucide-react';
import './DonationListings.css';

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

const center = {
  lat: 12.9716,
  lng: 77.5946
};

// Component to change map view
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks for user location
const LocationMarker = ({ setLocation, setAddress }) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng);
      setAddress(`Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`);
    },
  });
  return null;
};

const DonationListings = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [originalDonations, setOriginalDonations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    fetchDonations();
    getUserLocation();
  }, []);

  useEffect(() => {
    const translateDonations = async () => {
      if (!originalDonations.length) return;
      if (!i18n.language || i18n.language.startsWith('en')) {
         setDonations(originalDonations);
         return;
      }
      const textsToTranslate = [];
      originalDonations.forEach(d => {
          textsToTranslate.push(d.food_type);
          textsToTranslate.push(d.description);
      });
      const translations = await translateTexts(textsToTranslate, i18n.language);
      let tIndex = 0;
      const translated = originalDonations.map(d => ({
          ...d,
          food_type: translations[tIndex++] || d.food_type,
          description: translations[tIndex++] || d.description
      }));
      setDonations(translated);
    };
    translateDonations();
  }, [originalDonations, i18n.language]);

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
    setUserLocation({ lat, lng });
    setDeliveryAddress(result.display_name);
    setAddressSearch(result.display_name);
    setSearchResults([]);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          setDeliveryAddress("My Current Location");
        },
        (error) => {
          console.error("Geolocation failed:", error);
          alert("Could not get your location automatically. Please ensure location permissions are granted or use the search bar above.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  const calculateDistances = () => {
    if (!userLocation || donations.length === 0) return;

    const results = {};
    donations.forEach(donation => {
      const distance = calculateHaversineDistance(
        userLocation.lat, userLocation.lng,
        donation.location_lat, donation.location_lng
      );
      
      const distanceKm = (distance / 1000).toFixed(1);
      // Rough estimation of duration: 5 min per km
      const durationMin = Math.round(distanceKm * 5);

      results[donation.id] = {
        distance: `${distanceKm} km`,
        distanceValue: distance,
        duration: `${durationMin} mins`
      };
    });
    setDistanceInfo(results);
  };

  useEffect(() => {
    if (userLocation && donations.length > 0) {
      calculateDistances();
    }
  }, [userLocation, donations]);

  const fetchDonations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/donations/?status=available`);
      setOriginalDonations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [claimingId, setClaimingId] = useState(null);

  const handleRequest = async (donationId) => {
    if (!user) {
      alert('Please login to request food');
      return;
    }

    if (!userLocation) {
      alert('Please set your delivery location first! Use the "Set Your Delivery Location" box in the sidebar or click on the map.');
      return;
    }

    const info = distanceInfo[donationId];
    if (info && info.distanceValue > 1000000) { 
      alert("Food is too far away. Please choose food nearer to your location");
      return;
    }

    setClaimingId(donationId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/requests/`, 
        { 
          donation_id: donationId, 
          message: requestMessage,
          delivery_lat: userLocation?.lat,
          delivery_lng: userLocation?.lng,
          delivery_address: deliveryAddress || 'My Current Location'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Food successfully claimed! A volunteer will be assigned.');
      setRequestMessage('');
      fetchDonations();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send request');
    } finally {
      setClaimingId(null);
    }
  };

  const filteredDonations = donations
    .filter(d => d.donor_id !== user?.id)
    .filter(d => (d.food_type || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="donation-listings-page">
      <div className="sidebar-list">
        <header className="listing-header">
          <div className="title-area">
            <ListIcon size={24} />
            <h1>{t('donations.available')}</h1>
          </div>
          <p>{filteredDonations.length} {t('donations.itemsFound')}</p>
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search food type..." 
              className="glass-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="location-picker" style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <MapPin size={14} style={{ display: 'inline', marginRight: '5px' }} />
            Set Your Delivery Location
          </p>
          <div className="search-container" style={{ position: 'relative', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search for an address..."
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
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, 
                padding: '0.5rem', maxHeight: '200px', overflowY: 'auto', 
                borderRadius: '12px', marginTop: '5px', background: 'var(--dark-bg)'
              }}>
                {searchResults.map((result, index) => (
                  <div key={index} className="search-result-item" onClick={() => selectAddress(result)}
                    style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}>
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn-primary" onClick={getUserLocation} style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem' }}>
            📍 Use My Current Location
          </button>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Or click anywhere on the map to set location.
          </p>
        </div>

        <div className="listing-scroll">
          {loading ? (
            <p className="padding">{t('donations.loading')}</p>
          ) : filteredDonations.length === 0 ? (
            <p className="padding">{t('donations.noDonations')}</p>
          ) : (
            filteredDonations.map(donation => (
              <div 
                key={donation.id} 
                className={`donation-card card ${selectedDonation?.id === donation.id ? 'active' : ''}`}
                onClick={() => setSelectedDonation(donation)}
              >
                {donation.image_url && (
                  <div className="card-image">
                    <img src={donation.image_url} alt={donation.food_type} />
                  </div>
                )}
                <div className="card-header">
                  <h3>{donation.food_type}</h3>
                  <span className="quantity-badge">{donation.quantity}</span>
                </div>
                <p className="description">{donation.description}</p>
                <div className="card-footer">
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{t('donations.posted')}: {new Date(donation.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{t('donations.expires')}: {new Date(donation.expiry_time).toLocaleDateString()}</span>
                  </div>
                  
                  {distanceInfo[donation.id] && (
                    <div className={`distance-pill ${distanceInfo[donation.id].distanceValue > 20000 ? 'too-far' : ''}`}>
                      <Navigation size={14} />
                      {distanceInfo[donation.id].distance} • {distanceInfo[donation.id].duration}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="map-view">
        <MapContainer 
          center={selectedDonation ? [selectedDonation.location_lat, selectedDonation.location_lng] : (userLocation ? [userLocation.lat, userLocation.lng] : [center.lat, center.lng])} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView 
            center={selectedDonation ? [selectedDonation.location_lat, selectedDonation.location_lng] : (userLocation ? [userLocation.lat, userLocation.lng] : [center.lat, center.lng])} 
            zoom={13} 
          />
          <LocationMarker setLocation={setUserLocation} setAddress={setDeliveryAddress} />
          
          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={userIcon}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {filteredDonations.map(donation => (
            <Marker
              key={donation.id}
              position={[donation.location_lat, donation.location_lng]}
              eventHandlers={{
                click: () => setSelectedDonation(donation),
              }}
            >
              <Popup>
                <div className="info-window">
                  <h3>{donation.food_type}</h3>
                  <textarea 
                    placeholder={t('donations.messagePlaceholder')}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="glass-input"
                    style={{ background: 'rgba(0,0,0,0.1)', color: 'black', marginBottom: '0.5rem' }}
                  />
                  {distanceInfo[donation.id] && (
                    <p style={{ fontSize: '0.85rem', color: 'black', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Distance: {distanceInfo[donation.id].distance}
                    </p>
                  )}
                  <button 
                    onClick={() => handleRequest(donation.id)}
                    className="btn-primary"
                    style={{ width: '100%' }}
                    disabled={claimingId === donation.id}
                  >
                    {claimingId === donation.id ? 'Claiming...' : 'Claim Food'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default DonationListings;
