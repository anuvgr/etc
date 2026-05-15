import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { UserCog, Plus, Shield, User, Trash2, Edit } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'staff' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await client.get('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await client.put(`/users/${editingUser.id}`, formData);
      } else {
        await client.post('/users', formData);
      }
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
      setFormData({ username: '', password: '', role: 'staff' });
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setShowModal(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>Staff Management</h3>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setFormData({ username: '', password: '', role: 'staff' }); setShowModal(true); }}>
          <Plus size={20} /> Add New Staff
        </button>
      </div>

      <div className="stat-grid">
        {users.map(user => (
          <div key={user.id} className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
            }}>
              {user.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1.125rem' }}>{user.username}</h4>
              <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}>{user.role}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ 
                padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '0.75rem' 
              }}>Active</span>
              <button 
                className="btn" 
                style={{ color: 'var(--primary)', padding: '0.4rem' }}
                onClick={() => openEdit(user)}
                title="Edit User"
              >
                <Edit size={18} />
              </button>
              <button 
                className="btn" 
                className="btn" 
                style={{ color: '#ef4444', padding: '0.4rem' }}
                onClick={async () => {
                  if (window.confirm(`Delete user "${user.username}"?`)) {
                    try {
                      await client.delete(`/users/${user.id}`);
                      fetchUsers();
                    } catch (err) {
                      alert(err.response?.data?.error || 'Failed to delete user');
                    }
                  }
                }}
                title="Delete User"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingUser ? 'Edit System User' : 'Add System User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Username</label>
                <input 
                  type="text" className="input" required 
                  value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="label">Password {editingUser && '(Leave blank to keep current)'}</label>
                <input 
                  type="password" className="input" required={!editingUser} 
                  value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label className="label">Access Role</label>
                <select 
                  className="input" required 
                  value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="staff">Staff (Billing Only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingUser(null); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
