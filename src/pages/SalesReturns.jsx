import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { RefreshCcw, Plus, Search, Calendar, ExternalLink } from 'lucide-react';
import { formatDate } from '../utils/format';
import SalesReturnForm from '../components/SalesReturnForm';

const SalesReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data } = await client.get('/sales-returns');
      setReturns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(r => 
    r.return_number.toLowerCase().includes(search.toLowerCase()) || 
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.original_invoice?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            style={{ paddingLeft: '2.5rem' }} 
            placeholder="Search returns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Record Sales Return
        </button>
      </div>

      <div className="card glass">
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <RefreshCcw size={20} className="text-primary" />
          <h3>Sales Returns (Credit Notes)</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Return No.</th>
              <th>Original Invoice</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map((ret, index) => (
              <tr key={ret.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td style={{ fontWeight: '600' }}>{ret.return_number}</td>
                <td className="text-muted">{ret.original_invoice}</td>
                <td>{ret.customer_name}</td>
                <td>{formatDate(ret.date)}</td>
                <td style={{ fontWeight: '600', color: '#ef4444' }}>₹{ret.total.toLocaleString()}</td>
                <td style={{ fontSize: '0.875rem' }}>{ret.reason}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.4rem' }} 
                      title="Print Credit Note"
                      onClick={() => window.open(`/print/sales-return/${ret.id}`, '_blank')}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredReturns.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
            <RefreshCcw size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No sales returns recorded yet.</p>
          </div>
        )}
      </div>

      {showForm && (
        <SalesReturnForm 
          onCancel={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchReturns();
          }}
        />
      )}
    </div>
  );
};

export default SalesReturns;
