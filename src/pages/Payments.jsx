import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { IndianRupee, Plus, Search, ExternalLink } from 'lucide-react';
import { formatDate } from '../utils/format';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data } = await client.get('/payments');
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.invoice_number?.toLowerCase().includes(search.toLowerCase())
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
            placeholder="Search payments..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary">
          <Plus size={20} /> Add Payment
        </button>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Invoice #</th>
              <th>Mode</th>
              <th>Amount (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment, index) => (
              <tr key={payment.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td>{formatDate(payment.date)}</td>
                <td style={{ fontWeight: '600' }}>{payment.customer_name}</td>
                <td>{payment.invoice_number}</td>
                <td>{payment.payment_mode}</td>
                <td style={{ fontWeight: '700', color: '#10b981' }}>₹{payment.amount.toLocaleString()}</td>
                <td>
                  <button onClick={() => window.open(`/print/receipt/${payment.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.4rem' }} title="Print Receipt">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;
