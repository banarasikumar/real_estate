import React from 'react';

export default function AdminHomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f4f4f5', minHeight: '100vh' }}>
      <h1>Admin Management Dashboard</h1>
      <p>Welcome to the secure admin panel.</p>
      <ul>
        <li>Manage Users & Owners</li>
        <li>Review & Approve Properties</li>
        <li>Platform Analytics</li>
      </ul>
    </div>
  );
}
