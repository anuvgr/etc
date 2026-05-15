import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Calendar, Plus,
  CheckCircle, Clock, AlertTriangle, RefreshCw, ChevronRight
} from 'lucide-react';
import client from '../api/client';

const Settings = () => {
  const [fyears, setFyears] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFY, setNewFY] = useState({ label: '', start_date: '', end_date: '' });
  const [fyLoading, setFyLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchFYears();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFYears = async () => {
    setFyLoading(true);
    try {
      const res = await client.get('/financial-years');
      setFyears(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFyLoading(false);
    }
  };

  const handleAddFY = async (e) => {
    e.preventDefault();
    if (!newFY.label || !newFY.start_date || !newFY.end_date) {
      return showToast('Please fill all fields', 'error');
    }
    try {
      await client.post('/financial-years', newFY);
      showToast(`Financial Year "${newFY.label}" added successfully!`);
      setNewFY({ label: '', start_date: '', end_date: '' });
      setShowAddForm(false);
      fetchFYears();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add FY', 'error');
    }
  };

  const handleActivate = async (fy) => {
    if (fy.is_active) return;
    const confirmed = window.confirm(
      `Switch to Financial Year "${fy.label}"?\n\nThis will:\n✅ Mark FY ${fy.label} as ACTIVE\n✅ Reset invoice counters to 0001 for new FY\n✅ Carry all customer/supplier balances forward as Opening Balance\n\nAll historical data remains safely stored.`
    );
    if (!confirmed) return;
    setActivating(fy.id);
    try {
      await client.put(`/financial-years/${fy.id}/activate`);
      showToast(`Switched to FY ${fy.label}! Invoice counters reset. Balances carried forward.`);
      fetchFYears();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to activate FY', 'error');
    } finally {
      setActivating(null);
    }
  };

  // Auto-calculate end_date when start_date changes
  const handleStartDateChange = (val) => {
    const start = new Date(val);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const endStr = end.toISOString().split('T')[0];
    setNewFY(prev => ({ ...prev, start_date: val, end_date: endStr }));
  };

  const activeFY = fyears.find(f => f.is_active);

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.9rem 1.5rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Financial Year Management */}
      <div className="card glass" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={24} className="text-primary" />
            <div>
              <h3>Financial Year Management</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                {activeFY ? `Active: FY ${activeFY.label} (${activeFY.start_date} to ${activeFY.end_date})` : 'No active financial year'}
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={18} /> New Financial Year
          </button>
        </div>

        {/* Add FY Form */}
        {showAddForm && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Insert New Financial Year</h4>
            <form onSubmit={handleAddFY} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div className="input-group">
                <label className="label">Label (e.g. 27-28)</label>
                <input
                  type="text" className="input" placeholder="e.g. 27-28"
                  value={newFY.label}
                  onChange={e => setNewFY(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="label">Start Date</label>
                <input
                  type="date" className="input"
                  value={newFY.start_date}
                  onChange={e => handleStartDateChange(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="label">End Date</label>
                <input
                  type="date" className="input"
                  value={newFY.end_date}
                  onChange={e => setNewFY(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: 'span 3', display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Financial Year
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FY List */}
        {fyLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : fyears.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No financial years found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Financial Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fyears.map(fy => (
                <tr key={fy.id}>
                  <td style={{ fontWeight: '700', fontSize: '1rem' }}>FY {fy.label}</td>
                  <td>{fy.start_date}</td>
                  <td>{fy.end_date}</td>
                  <td>
                    {fy.is_active ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.8rem', borderRadius: '20px',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '700', fontSize: '0.8rem'
                      }}>
                        <CheckCircle size={14} /> ACTIVE
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.8rem', borderRadius: '20px',
                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.8rem'
                      }}>
                        <Clock size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td>
                    {!fy.is_active ? (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => handleActivate(fy)}
                        disabled={activating === fy.id}
                      >
                        {activating === fy.id ? (
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {activating === fy.id ? 'Switching...' : 'Activate & Switch'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Current FY</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Info Box */}
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.5rem', borderRadius: '10px',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            ⚡ What happens when you Activate a new Financial Year?
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: '1.8' }}>
            <li>Old FY is marked <b>Inactive</b>, new FY becomes <b>Active</b></li>
            <li>Invoice counters automatically <b>reset to 0001</b> for the new FY prefix (e.g. INV/27-28/0001)</li>
            <li>Customer & Supplier ledgers show <b>Opening Balance</b> carried from the old FY</li>
            <li>All historical data is <b>safely preserved</b> — nothing is deleted</li>
          </ul>
        </div>
      </div>

      {/* Company Profile */}
      <div className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <SettingsIcon size={24} className="text-primary" />
          <h3>Company Profile</h3>
        </div>

        <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">Company Name</label>
            <input type="text" className="input" defaultValue="Ephphatha Construction Trading Company" />
          </div>

          <div className="input-group">
            <label className="label">Primary Phone</label>
            <input type="text" className="input" defaultValue="+91 98765 43210" />
          </div>

          <div className="input-group">
            <label className="label">Email Address</label>
            <input type="email" className="input" defaultValue="info@ephphatha.com" />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">Business Address</label>
            <textarea className="input" style={{ height: '80px', resize: 'none' }} defaultValue="Industrial Estate, Lane 4, Ernakulam, Kerala"></textarea>
          </div>

          <div className="input-group">
            <label className="label">GSTIN</label>
            <input type="text" className="input" defaultValue="32AAAAA0000A1Z5" />
          </div>

          <div className="input-group">
            <label className="label">Currency Symbol</label>
            <input type="text" className="input" defaultValue="₹" />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="button" className="btn btn-primary">
              <Save size={18} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
