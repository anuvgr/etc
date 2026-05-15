import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { Search, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';

const PurchaseReturnForm = ({ onSave, onCancel }) => {
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data } = await client.get('/purchases');
      setPurchases(data);
    } catch (err) {
      console.error('Failed to fetch purchases', err);
    }
  };

  const handlePurchaseChange = async (purchaseId) => {
    if (!purchaseId) {
      setSelectedPurchase(null);
      setItems([]);
      return;
    }

    const pur = purchases.find(p => p.id === parseInt(purchaseId));
    setSelectedPurchase(pur);
    
    try {
      const { data } = await client.get(`/purchases/${purchaseId}/items`);
      // Map purchase items to return items
      const returnItems = data.map(item => ({
        ...item,
        purchase_item_id: item.id,
        return_qty: 0,
        max_qty: item.quantity // Can't return more than bought
      }));
      setItems(returnItems);
    } catch (err) {
      console.error('Failed to fetch purchase items', err);
    }
  };

  const handleQtyChange = (idx, val) => {
    const newItems = [...items];
    const qty = parseFloat(val) || 0;
    if (qty > newItems[idx].max_qty) {
      setError(`Cannot return more than bought (${newItems[idx].max_qty})`);
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
      const igst = 0; // Simplified for now, can be adjusted if needed
      return {
        subtotal: acc.subtotal + subtotal,
        cgst: acc.cgst + cgst,
        sgst: acc.sgst + sgst,
        igst: acc.igst + igst,
        total: acc.total + subtotal + cgst + sgst + igst
      };
    }, { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPurchase) return setError('Please select a purchase bill');
    if (items.every(i => i.return_qty === 0)) return setError('Please return at least one item');

    setLoading(true);
    try {
      const payload = {
        purchase_id: selectedPurchase.id,
        supplier_id: selectedPurchase.supplier_id,
        date: returnDate,
        reason,
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        items: items.filter(i => i.return_qty > 0).map(i => ({
          product_id: i.product_id,
          quantity: i.return_qty,
          unit_price: i.unit_price,
          gst_rate: i.gst_rate
        }))
      };

      await client.post('/purchase-returns', payload);
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>New Purchase Return (Debit Note)</h2>
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
            <label className="label">Select Purchase Bill</label>
            <select 
              className="input" 
              onChange={(e) => handlePurchaseChange(e.target.value)}
              required
            >
              <option value="">-- Choose Purchase --</option>
              {purchases.map(pur => (
                <option key={pur.id} value={pur.id}>
                  {pur.purchase_number} - {pur.supplier_name} ({formatDate(pur.date)})
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

        {selectedPurchase && (
          <div className="animate-in">
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Supplier:</div>
              <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedPurchase.supplier_name}</div>
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
                  <th style={{ width: '100px' }}>Bought Qty</th>
                  <th style={{ width: '120px' }}>Return Qty</th>
                  <th style={{ width: '120px' }}>Cost Price</th>
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
                  <span className="text-muted">CGST/SGST:</span>
                  <span>₹{(totals.cgst + totals.sgst).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '1rem' }}>
                  <span>Debit Amount:</span>
                  <span>₹{totals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                <Save size={18} /> {loading ? 'Saving...' : 'Record Purchase Return'}
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

export default PurchaseReturnForm;
