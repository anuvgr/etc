import React, { useState, useEffect } from 'react';
import { Database, Download, ShieldCheck, AlertTriangle, RefreshCw, Trash2, Upload, Calendar, FileJson, CheckCircle } from 'lucide-react';
import client from '../api/client';

const Backup = () => {
  const [loading, setLoading] = useState(false);
  const [resetType, setResetType] = useState('logs');
  const [fyears, setFyears] = useState([]);
  const [selectedFY, setSelectedFY] = useState('');
  const [fyLoading, setFyLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchFYears();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFYears = async () => {
    try {
      const res = await client.get('/financial-years');
      setFyears(res.data);
      const active = res.data.find(f => f.is_active);
      if (active) setSelectedFY(active.id.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    window.open(`http://localhost:5000/api/backup?token=${token}`, '_blank');
    showToast('Full database backup download started!');
  };

  const handleFYBackup = () => {
    if (!selectedFY) return showToast('Please select a financial year', 'error');
    const fy = fyears.find(f => f.id.toString() === selectedFY);
    setFyLoading(true);
    const token = localStorage.getItem('token');
    
    // Create a temporary anchor to trigger download
    const link = document.createElement('a');
    link.href = `http://localhost:5000/api/backup/fy/${selectedFY}?token=${token}`;
    link.download = `ETC_FY_${fy?.label}_Backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setFyLoading(false);
      showToast(`FY ${fy?.label} backup downloaded! Contains all invoices, purchases, payments & expenses.`);
    }, 1500);
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm('WARNING: This will overwrite your current database. Proceed?')) return;
    const formData = new FormData();
    formData.append('database', file);
    setLoading(true);
    try {
      const { data } = await client.post('/restore', formData);
      showToast(data.message);
    } catch (err) {
      showToast('Restore failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`CRITICAL WARNING: This will PERMANENTLY DELETE all ${resetType}. This action cannot be undone. Proceed?`)) return;
    setLoading(true);
    try {
      const { data } = await client.post('/system/reset', { type: resetType });
      setToast({ type: 'done', msg: data.message });
    } catch (err) {
      showToast('Reset failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Success Modal */}
      {toast?.type === 'done' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="card glass animate-in" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle size={32} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Reset Successful!</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              The selected data (<b>{resetType}</b>) has been permanently cleared from the system.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => setToast(null)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Great, Continue
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && toast.type !== 'done' && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.9rem 1.5rem', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem',
          maxWidth: '450px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* --- Backup Section --- */}
      <div className="card glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Database size={24} className="text-primary" />
          <h3>System Maintenance</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Full Backup */}
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Download size={20} className="text-primary" />
              <h4 style={{ margin: 0 }}>Full Database Backup</h4>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Download a complete copy of the entire system database (all years) as a <b>.sqlite</b> file.
            </p>
            <button onClick={handleDownload} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Download size={18} /> Download (.sqlite)
            </button>
          </div>

          {/* Restore */}
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Upload size={20} style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0 }}>Restore System</h4>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Upload a previously downloaded <b>.sqlite</b> file to restore your data.
            </p>
            <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
              <Upload size={18} /> Upload & Restore
              <input type="file" accept=".sqlite" onChange={handleRestore} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* --- FY Wise Backup --- */}
      <div className="card glass" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Calendar size={24} className="text-primary" />
          <div>
            <h3>Financial Year Wise Backup</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Export all data for a specific financial year as a structured JSON file</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Select Financial Year</label>
            <select className="input" value={selectedFY} onChange={e => setSelectedFY(e.target.value)}>
              <option value="">-- Select FY --</option>
              {fyears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  FY {fy.label} ({fy.start_date} to {fy.end_date}) {fy.is_active ? '✓ Active' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFYBackup}
            disabled={fyLoading || !selectedFY}
            style={{ height: '42px', minWidth: '160px', justifyContent: 'center' }}
          >
            {fyLoading
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
              : <><FileJson size={16} /> Download FY Backup</>
            }
          </button>
        </div>

        {/* What's included */}
        <div style={{
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: '10px', padding: '1rem 1.5rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.6rem', color: 'var(--primary)', fontSize: '0.875rem' }}>
            📦 FY Backup includes:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {[
              '✅ All Invoices & Line Items',
              '✅ All Purchases & Line Items',
              '✅ Payment Records',
              '✅ Expense Records',
              '✅ Sales Returns (Credit Notes)',
              '✅ Purchase Returns (Debit Notes)',
              '✅ Customer Master Data',
              '✅ Supplier Master Data',
              '✅ Product Inventory Snapshot',
            ].map((item, i) => (
              <div key={i}>{item}</div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            <b>Format:</b> JSON — can be opened in any spreadsheet tool or re-imported. File name: <code>ETC_FY_26-27_Backup_YYYY-MM-DD.json</code>
          </p>
        </div>
      </div>

      {/* --- Factory Reset --- */}
      <div className="card glass" style={{ borderLeft: '4px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Trash2 size={24} style={{ color: '#ef4444' }} />
          <h3>Factory Reset</h3>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: '500' }}>
            Warning: These actions are permanent and cannot be reversed. Please ensure you have a backup before proceeding.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="label">Select Data to Reset</label>
            <select className="input" value={resetType} onChange={(e) => setResetType(e.target.value)}>
              <option value="logs">Activity Logs Only</option>
              <option value="invoices">Invoices & Items</option>
              <option value="quotations">Quotations & Items</option>
              <option value="customers">Customer Master</option>
              <option value="products">Product Inventory</option>
              <option value="payments">Payment Records</option>
              <option value="expenses">Expense Records</option>
              <option value="suppliers">Supplier Master</option>
              <option value="all">FULL SYSTEM RESET (Everything)</option>
            </select>
          </div>
          <button
            onClick={handleReset}
            className="btn"
            style={{ background: '#ef4444', color: 'white', height: '42px' }}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Resetting...' : 'Execute Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Backup;
