import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';
import './Dashboard.css';

const Profile = () => {
    const { user } = useAuth();

    const getBadge = (count) => {
        if (count >= 201) return { icon: "🟢", name: "Legend", subtitle: "Community hero", color: "#2ecc71" };
        if (count >= 101) return { icon: "🔴", name: "Elite", subtitle: "Exceptional impact", color: "#e74c3c" };
        if (count >= 61) return { icon: "🟣", name: "Diamond", subtitle: "Top contributor", color: "#9b59b6" };
        if (count >= 31) return { icon: "🔵", name: "Platinum", subtitle: "Highly committed", color: "#3498db" };
        if (count >= 16) return { icon: "🟡", name: "Gold", subtitle: "Active donor", color: "#f1c40f" };
        if (count >= 6) return { icon: "⚪", name: "Silver", subtitle: "Regular contributor", color: "#ecf0f1" };
        if (count >= 1) return { icon: "🟤", name: "Bronze", subtitle: "Beginner donor", color: "#cd7f32" };
        return null;
    };

    if (!user) return <div className="container">Please login to view your profile.</div>;

    const badge = user.role === 'individual' ? getBadge(user.donation_count || 0) : null;

    return (
        <div className="container dashboard fade-in">
            <header className="dashboard-header">
                <h1>User Profile</h1>
            </header>
            
            <div className="profile-content card">
                <div className="profile-main">
                    <div className="profile-avatar large">
                        {user.name[0]}
                    </div>
                    <div className="profile-info">
                        <h2>{user.name}</h2>
                        <p className="email">{user.email}</p>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <span className={`role-badge ${user.role}`}>{user.role}</span>
                            {badge && (
                                <div className="donor-badge" style={{ borderColor: badge.color }}>
                                    <span className="badge-icon">{badge.icon}</span>
                                    <div className="badge-text">
                                        <span className="badge-name">{badge.name}</span>
                                        <span className="badge-subtitle">{badge.subtitle}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="profile-details">
                    <div className="detail-item">
                        <label>Member Since</label>
                        <p>{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="detail-item">
                        <label>Phone Number</label>
                        <p>{user.phone_number || "Not provided"}</p>
                    </div>
                    <div className="detail-item">
                        <label>Verified Status</label>
                        <p>✅ Verified Account</p>
                    </div>
                </div>
            </div>

            <section className="dashboard-content" style={{ marginTop: '2rem' }}>
                <h2>Your Sustainable Impact</h2>
                <div className="stats-grid">
                    <div className="stat-card card">
                        <div className="stat-icon-wrapper" style={{ margin: '0 auto 1rem' }}>
                            <Heart className="primary-icon" size={24} />
                        </div>
                        <h3>Hero of the Community</h3>
                        <p>Thank you for contributing to a zero-waste future!</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Profile;
