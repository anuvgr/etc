import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { Save, X } from 'lucide-react';

const PurchaseReturnForm = ({ onSave, onCancel }) => {
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [items, setItems] = useState([]);
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
      console.error(err);
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
      setItems(data.map(item => ({ ...item, return_qty: 0, max_qty: item.quantity })));
    } catch (err) {
      console.error(err);
    }
  };

  const totals = items.reduce((acc, item) => {
    const amt = item.return_qty * item.unit_price;
    return acc + amt + (amt * (item.gst_rate || 18) / 100);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let subtotal = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      
      const filteredItems = items.filter(i => i.return_qty > 0);
      if (filteredItems.length === 0) return alert('Please enter at least one quantity to return.');

      filteredItems.forEach(item => {
        const amt = item.return_qty * item.unit_price;
        subtotal += amt;
        const taxRate = item.gst_rate || 18;
        cgst += amt * (taxRate / 2) / 100;
        sgst += amt * (taxRate / 2) / 100;
      });

      const total = subtotal + cgst + sgst;

      const payload = {
        purchase_id: selectedPurchase.id,
        supplier_id: selectedPurchase.supplier_id,
        date: returnDate,
        reason,
        subtotal,
        cgst,
        sgst,
        igst,
        total,
        items: filteredItems
      };
      await client.post('/purchase-returns', payload);
      onSave();
    } catch (err) {
      alert('Failed to save return: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="card glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>New Purchase Return</h2>
        <button onClick={onCancel}><X /></button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="label">Purchase Bill</label>
          <select className="input" onChange={(e) => handlePurchaseChange(e.target.value)} required>
            <option value="">Select Bill</option>
            {purchases.map(pur => <option key={pur.id} value={pur.id}>{pur.purchase_number} - {pur.supplier_name}</option>)}
          </select>
        </div>
        {selectedPurchase && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', gap: '2rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Supplier Name</span>
                <strong style={{ fontSize: '1.1rem' }}>{selectedPurchase.supplier_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Bill Date</span>
                <strong>{formatDate(selectedPurchase.date)}</strong>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty to Return</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{item.product_name}</div>
                      {item.part_number && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.part_number}</div>}
                    </td>
                    <td>
                      <input type="number" className="input" value={item.return_qty} onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].return_qty = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }} />
                    </td>
                    <td>₹{(item.return_qty * item.unit_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <h3>Debit Amount: ₹{totals.toLocaleString()}</h3>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              <button type="button" onClick={onCancel} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PurchaseReturnForm;
