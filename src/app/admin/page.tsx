import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    return (
        <div>
            <h1>Admin Dashboard</h1>
            <div className='key-metrics'>
                <h2>Key Metrics</h2>
                <ul>
                    <li>Total Users: 100</li>
                    <li>Total Sales: $5000</li>
                    <li>Revenue: $2000</li>
                </ul>
            </div>
            <div className='navigation-links'>
                <h2>Navigation</h2>
                <ul>
                    <li><Link to='/users'>Manage Users</Link></li>
                    <li><Link to='/sales'>View Sales</Link></li>
                    <li><Link to='/settings'>Settings</Link></li>
                </ul>
            </div>
        </div>
    );
};

export default AdminDashboard;