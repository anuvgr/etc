import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { ClipboardList, Plus, Search, Send, CheckCircle, FileText, MessageCircle, Calendar } from 'lucide-react';
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

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, [fromDate, toDate]);

  const fetchQuotes = async () => {
    try {
      const params = fromDate && toDate ? { from: fromDate, to: toDate } : {};
      const { data } = await client.get('/quotations', { params });
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
      alert('Failed to load quotation details for conversion');
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
            type="text"
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search quotes..."
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
              <Plus size={20} /> Create Quotation
            </button>
          )}
        </div>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Quote #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote, index) => (
              <tr key={quote.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td style={{ fontWeight: '600' }}>{quote.quote_number}</td>
                <td>{quote.customer_name}</td>
                <td>{formatDate(quote.date)}</td>
                <td style={{ fontWeight: '600', color: 'var(--accent)' }}>₹{quote.total.toLocaleString()}</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: quote.status === 'Accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                    color: quote.status === 'Accepted' ? '#10b981' : '#94a3b8'
                  }}>
                    {quote.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      const phone = quote.customer_phone?.replace(/[^0-9]/g, '');
                      if (!phone) return alert('No phone number found');
                      const msg = `Dear ${quote.customer_name}, Your Quotation ${quote.quote_number} for ₹${quote.total.toLocaleString()} from Ephphatha Construction is ready.`;
                      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0.4rem', color: '#25D366' }}
                    title="Send via WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button onClick={() => window.open(`/print/quote/${quote.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.4rem' }} title="Print Quotation">
                    <FileText size={16} />
                  </button>
                  {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem' }}
                      title="Convert to Invoice"
                      onClick={() => handleConvert(quote.id)}
                      disabled={quote.status === 'Declined'}
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredQuotes.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
            <ClipboardList size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No quotations found. Create one to get started!</p>
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          type="quote"
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchQuotes();
          }}
        />
      )}

      {showInvoiceForm && (
        <InvoiceForm
          type="invoice"
          initialData={convertingData}
          onClose={() => {
            setShowInvoiceForm(false);
            setConvertingData(null);
          }}
          onSuccess={() => {
            setShowInvoiceForm(false);
            setConvertingData(null);
            fetchQuotes();
          }}
        />
      )}
    </div>
  );
};

export default Quotes;
