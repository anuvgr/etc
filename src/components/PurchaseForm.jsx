import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';
import client from '../api/client';

const PurchaseForm = ({ onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, rate: 0, tax_rate: 18, amount: 0 }]);
  const [isIGST, setIsIGST] = useState(false);
  const [status, setStatus] = useState('Received');
  const [billNumber, setBillNumber] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          client.get('/suppliers'),
          client.get('/products')
        ]);
        setSuppliers(supRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, rate: 0, tax_rate: 18, amount: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        newItems[index].rate = prod.purchase_price || 0;
        newItems[index].tax_rate = prod.tax_rate || 18;
      }
    }

    newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
  const total = subtotal + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplier_id: selectedSupplier,
        purchase_number: billNumber,
        date: new Date().toISOString().split('T')[0],
        subtotal, total, items, status
      };
      await client.post('/purchases', payload);
      onSuccess();
    } catch (err) {
      alert('Failed to save purchase');
    }
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>New Purchase</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Supplier</label>
            <select className="input" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} required>
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name ? `${s.company_name} (${s.name})` : s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="label">Bill No</label>
            <input type="text" className="input" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} required />
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <select className="input" value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} required>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="input" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} /></td>
                  <td><input type="number" className="input" value={item.rate} onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))} /></td>
                  <td>{item.amount.toLocaleString()}</td>
                  <td><button type="button" onClick={() => removeItem(index)}><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addItem} className="btn btn-outline" style={{ marginBottom: '1rem' }}>+ Add Row</button>
          <div style={{ textAlign: 'right' }}>
            <h3>Total: ₹{total.toLocaleString()}</h3>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PurchaseForm;
