import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ShoppingCart, Plus, Search, Calendar, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data } = await client.get('/purchases');
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.purchase_number.toLowerCase().includes(search.toLowerCase()) || 
    p.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" className="input" style={{ paddingLeft: '2.5rem' }} 
            placeholder="Search purchases..." 
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Record Purchase
          </button>
        )}
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th>Purchase #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map(purchase => (
              <tr key={purchase.id}>
                <td style={{ fontWeight: '600' }}>{purchase.purchase_number}</td>
                <td>
                  <div>{purchase.supplier_company || purchase.supplier_name}</div>
                  {purchase.supplier_company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{purchase.supplier_name}</div>}
                </td>
                <td>{formatDate(purchase.date)}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{purchase.total.toLocaleString()}</td>
                <td>{purchase.status}</td>
                <td>
                  <button onClick={() => window.open(`/print/purchase/${purchase.id}`, '_blank')} className="btn btn-outline">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PurchaseForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchPurchases(); }} />
      )}
    </div>
  );
};

export default Purchases;
