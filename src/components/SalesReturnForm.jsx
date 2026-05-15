import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { Search, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';

const SalesReturnForm = ({ onSave, onCancel }) => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data } = await client.get('/invoices');
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    }
  };

  const handleInvoiceChange = async (invoiceId) => {
    if (!invoiceId) {
      setSelectedInvoice(null);
      setItems([]);
      return;
    }

    const inv = invoices.find(i => i.id === parseInt(invoiceId));
    setSelectedInvoice(inv);
    
    try {
      const { data } = await client.get(`/invoices/${invoiceId}/items`);
      // Map invoice items to return items
      const returnItems = data.map(item => ({
        ...item,
        invoice_item_id: item.id,
        return_qty: 0,
        max_qty: item.quantity // Can't return more than sold
      }));
      setItems(returnItems);
    } catch (err) {
      console.error('Failed to fetch invoice items', err);
    }
  };

  const handleQtyChange = (idx, val) => {
    const newItems = [...items];
    const qty = parseFloat(val) || 0;
    if (qty > newItems[idx].max_qty) {
      setError(`Cannot return more than sold (${newItems[idx].max_qty})`);
      return;
    }
    setError('');
    newItems[idx].return_qty = qty;
    setItems(newItems);
  };

  const calculateTotals = () => {
    return items.reduce((acc, item) => {
      const subtotal = item.return_qty * item.unit_price;
      const cgst = (subtotal * (item.gst_rate / 2)) / 100;
      const sgst = (subtotal * (item.gst_rate / 2)) / 100;
      return {
        subtotal: acc.subtotal + subtotal,
        cgst: acc.cgst + cgst,
        sgst: acc.sgst + sgst,
        total: acc.total + subtotal + cgst + sgst
      };
    }, { subtotal: 0, cgst: 0, sgst: 0, total: 0 });
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return setError('Please select an invoice');
    if (items.every(i => i.return_qty === 0)) return setError('Please return at least one item');

    setLoading(true);
    try {
      const payload = {
        invoice_id: selectedInvoice.id,
        customer_id: selectedInvoice.customer_id,
        date: returnDate,
        reason,
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        total: totals.total,
        items: items.filter(i => i.return_qty > 0).map(i => ({
          product_id: i.product_id,
          quantity: i.return_qty,
          unit_price: i.unit_price,
          gst_rate: i.gst_rate
        }))
      };

      await client.post('/sales-returns', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card glass animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>New Sales Return (Credit Note)</h2>
        <button onClick={onCancel} className="btn btn-outline" style={{ padding: '0.5rem' }}><X size={18} /></button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="input-group">
            <label className="label">Select Invoice</label>
            <select 
              className="input" 
              onChange={(e) => handleInvoiceChange(e.target.value)}
              required
            >
              <option value="">-- Choose Invoice --</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} - {inv.customer_name} ({formatDate(inv.date)})
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="label">Return Date</label>
            <input 
              type="date" 
              className="input" 
              value={returnDate} 
              onChange={(e) => setReturnDate(e.target.value)} 
              required 
            />
          </div>
        </div>

        {selectedInvoice && (
          <div className="animate-in">
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Customer:</div>
              <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedInvoice.customer_name}</div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label">Reason for Return</label>
              <textarea 
                className="input" 
                rows="2" 
                placeholder="Damaged goods, wrong item, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              ></textarea>
            </div>

            <table style={{ marginBottom: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: '100px' }}>Sold Qty</th>
                  <th style={{ width: '120px' }}>Return Qty</th>
                  <th style={{ width: '120px' }}>Unit Price</th>
                  <th style={{ width: '100px' }}>GST%</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{item.product_name}</td>
                    <td>{item.max_qty}</td>
                    <td>
                      <input 
                        type="number" 
                        className="input" 
                        value={item.return_qty} 
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        step="0.01"
                        min="0"
                        max={item.max_qty}
                      />
                    </td>
                    <td>₹{item.unit_price}</td>
                    <td>{item.gst_rate}%</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      ₹{(item.return_qty * item.unit_price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted">Subtotal:</span>
                  <span>₹{totals.subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted">CGST:</span>
                  <span>₹{totals.cgst.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="text-muted">SGST:</span>
                  <span>₹{totals.sgst.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '1rem' }}>
                  <span>Total Refund:</span>
                  <span>₹{totals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                <Save size={18} /> {loading ? 'Saving...' : 'Record Sales Return'}
              </button>
              <button type="button" onClick={onCancel} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                Discard
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SalesReturnForm;
