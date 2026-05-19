import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ShoppingCart, Plus, Search, Calendar, ExternalLink, ArrowLeftRight } from 'lucide-react';
import { formatDate } from '../utils/format';
import PurchaseReturnForm from '../components/PurchaseReturnForm';

const PurchaseReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data } = await client.get('/purchase-returns');
      setReturns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(r => 
    r.return_number.toLowerCase().includes(search.toLowerCase()) || 
    r.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" className="input" style={{ paddingLeft: '2.5rem' }} 
            placeholder="Search returns..." 
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Record Purchase Return
        </button>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th>Return No.</th>
              <th>Bill #</th>
              <th>Supplier</th>
              <th>Products</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map(ret => (
              <tr key={ret.id}>
                <td>{ret.return_number}</td>
                <td>{ret.original_bill}</td>
                <td>
                  <div>{ret.supplier_company || ret.supplier_name}</div>
                  {ret.supplier_company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ret.supplier_name}</div>}
                </td>
                <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.85rem' }} title={ret.product_names}>
                  {ret.product_names || '-'}
                </td>
                <td style={{ color: '#ef4444' }}>₹{ret.total.toLocaleString()}</td>
                <td>
                  <button onClick={() => window.open(`/print/purchase-return/${ret.id}`, '_blank')} className="btn btn-outline">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PurchaseReturnForm onCancel={() => setShowForm(false)} onSave={() => { setShowForm(false); fetchReturns(); }} />
      )}
    </div>
  );
};

export default PurchaseReturns;
