import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ClipboardList, Plus, Search, CheckCircle, FileText, MessageCircle, Calendar } from 'lucide-react';
import { formatDate } from '../utils/format';
import InvoiceForm from '../components/InvoiceForm';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';

const Quotes = () => {
  const { user } = useAuth();
  const { isLatestFY } = useFY();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [convertingData, setConvertingData] = useState(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data } = await client.get('/quotations');
      setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (id) => {
    try {
      const { data } = await client.get(`/quotations/${id}`);
      setConvertingData(data);
      setShowInvoiceForm(true);
    } catch (err) {
      alert('Failed to load quotation');
    }
  };

  const filteredQuotes = quotes.filter(q =>
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search quotes..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Create Quotation
          </button>
        )}
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map(quote => (
              <tr key={quote.id}>
                <td style={{ fontWeight: '600' }}>{quote.quote_number}</td>
                <td>{quote.customer_name}</td>
                <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.85rem' }} title={quote.product_names}>
                  {quote.product_names || '-'}
                </td>
                <td>{formatDate(quote.date)}</td>
                <td style={{ fontWeight: '600', color: 'var(--accent)' }}>₹{quote.total.toLocaleString()}</td>
                <td>{quote.status}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => window.open(`/print/quote/${quote.id}`, '_blank')} className="btn btn-outline">
                    <FileText size={16} />
                  </button>
                  <button className="btn btn-outline" onClick={() => handleConvert(quote.id)} disabled={quote.status === 'Declined'}>
                    <CheckCircle size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InvoiceForm type="quote" onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchQuotes(); }} />
      )}

      {showInvoiceForm && (
        <InvoiceForm type="invoice" initialData={convertingData} onClose={() => setShowInvoiceForm(false)} onSuccess={() => { setShowInvoiceForm(false); fetchQuotes(); }} />
      )}
    </div>
  );
};

export default Quotes;
