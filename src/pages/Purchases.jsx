import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ShoppingCart, Plus, Search, Calendar, ExternalLink, FileText } from 'lucide-react';
import { formatDate } from '../utils/format';
import PurchaseForm from '../components/PurchaseForm';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';

const Purchases = () => {
  const { user } = useAuth();
  const { isLatestFY } = useFY();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, [fromDate, toDate]);

  const fetchPurchases = async () => {
    try {
      const params = fromDate && toDate ? { from: fromDate, to: toDate } : {};
      const { data } = await client.get('/purchases', { params });
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.purchase_number.toLowerCase().includes(search.toLowerCase()) || 
    p.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            style={{ paddingLeft: '2.5rem' }} 
            placeholder="Search purchases..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <Calendar size={16} className="text-muted" />
            <input 
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '120px', fontSize: '0.875rem' }} 
              value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-muted">to</span>
            <input 
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '120px', fontSize: '0.875rem' }} 
              value={toDate} onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={20} /> Record Purchase
            </button>
          )}
        </div>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Purchase / Bill #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map((purchase, index) => (
              <tr key={purchase.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td style={{ fontWeight: '600' }}>{purchase.purchase_number}</td>
                <td>
                  <div style={{ fontWeight: '500' }}>{purchase.supplier_company || purchase.supplier_name}</div>
                  {purchase.supplier_company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{purchase.supplier_name}</div>}
                </td>
                <td>{formatDate(purchase.date)}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{purchase.total.toLocaleString()}</td>
                <td>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    background: purchase.status === 'Received' || purchase.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: purchase.status === 'Received' || purchase.status === 'Paid' ? '#10b981' : '#f59e0b'
                  }}>
                    {purchase.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => window.open(`/print/purchase/${purchase.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.4rem' }} title="View Details">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPurchases.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
            <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No purchases found. Record your first one!</p>
          </div>
        )}
      </div>

      {showForm && (
        <PurchaseForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            fetchPurchases();
          }} 
        />
      )}
    </div>
  );
};

export default Purchases;
