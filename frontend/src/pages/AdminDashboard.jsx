import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css'; // Reusing some base styles

const AdminDashboard = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [donations, setDonations] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [usersRes, donationsRes, requestsRes] = await Promise.all([
                axios.get('http://localhost:8000/api/users/', { headers }),
                axios.get('http://localhost:8000/api/donations/', { headers }),
                axios.get('http://localhost:8000/api/requests/my', { headers }) // This might need a real "all requests" endpoint
            ]);

            setUsers(usersRes.data);
            setDonations(donationsRes.data);
            setRequests(requestsRes.data);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:8000/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    if (loading) return <div className="container">Loading Admin Portal...</div>;

    return (
        <div className="container dashboard admin-dashboard fade-in">
            <header className="dashboard-header">
                <h1>Admin Control Panel</h1>
                <div className="tabs">
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Users</button>
                    <button className={activeTab === 'donations' ? 'active' : ''} onClick={() => setActiveTab('donations')}>Donations</button>
                    <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>Requests</button>
                </div>
            </header>

            <div className="tab-content">
                {activeTab === 'users' && (
                    <div className="admin-table card">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>#{u.id}</td>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                        <td>
                                            <button className="btn-danger small" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'donations' && (
                    <div className="admin-table card">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Food Type</th>
                                    <th>Quantity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donations.map(d => (
                                    <tr key={d.id}>
                                        <td>#{d.id}</td>
                                        <td>{d.food_type}</td>
                                        <td>{d.quantity}</td>
                                        <td><span className={`status-tag ${d.status}`}>{d.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="admin-table card">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Donation ID</th>
                                    <th>Status</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(r => (
                                    <tr key={r.id}>
                                        <td>#{r.id}</td>
                                        <td>#{r.donation_id}</td>
                                        <td><span className={`status-tag ${r.status}`}>{r.status}</span></td>
                                        <td>{r.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
