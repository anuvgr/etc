import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';
import client from '../api/client';

const InvoiceForm = ({ type = 'invoice', onClose, onSuccess, initialData = null }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, rate: 0, tax_rate: 18, amount: 0 }]);
  const [isIGST, setIsIGST] = useState(false);
  const [status, setStatus] = useState(type === 'invoice' ? 'Pending' : 'Open');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountInput, setDiscountInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          client.get('/customers'),
          client.get('/products')
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        console.error(err);
      }

      if (initialData) {
        setSelectedCustomer(initialData.customer_id.toString());
        setItems(initialData.items.map(item => ({
          product_id: item.product_id.toString(),
          quantity: item.quantity,
          rate: item.rate,
          tax_rate: item.tax_rate || 18,
          amount: item.amount
        })));
        setIsIGST(initialData.igst > 0);
        setDeliveryAddress(initialData.delivery_address || '');
        setDiscountInput(initialData.discount || '');
        setDiscountType('amount');
      }
    };
    fetchData();
  }, [initialData]);

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
        newItems[index].rate = prod.sales_price || 0;
        newItems[index].tax_rate = prod.tax_rate || 18;
      }
    }

    newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
  
  const calculatedDiscount = discountType === 'percentage' 
    ? (subtotal * (parseFloat(discountInput) || 0) / 100) 
    : (parseFloat(discountInput) || 0);

  const cgst = isIGST ? 0 : totalTax / 2;
  const sgst = isIGST ? 0 : totalTax / 2;
  const igst = isIGST ? totalTax : 0;
  const total = subtotal + totalTax - calculatedDiscount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customer_id: selectedCustomer,
        date: new Date().toISOString().split('T')[0],
        subtotal, cgst, sgst, igst, total, items, status,
        delivery_address: deliveryAddress,
        discount: calculatedDiscount
      };
      const endpoint = type === 'invoice' ? '/invoices' : '/quotations';
      await client.post(endpoint, payload);
      onSuccess();
    } catch (err) {
      alert('Failed to save ' + type);
    }
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Create {type}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Customer</label>
            <select className="input" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
                      {products.map(p => <option key={p.id} value={p.id}>{p.part_number ? `${p.part_number} - ` : ''}{p.name}</option>)}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <div className="input-group">
                <label className="label">Discount Type</label>
                <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="amount">Flat Amount (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Discount Value</label>
                <input 
                  type="number" 
                  className="input" 
                  value={discountInput} 
                  onChange={(e) => setDiscountInput(e.target.value)} 
                  min="0"
                  placeholder={discountType === 'percentage' ? "Enter %" : "Enter amount"}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Subtotal:</span>
                <span style={{ fontWeight: '600' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Total Tax:</span>
                <span style={{ fontWeight: '600' }}>₹{totalTax.toFixed(2)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#10b981' }}>
                  <span>Discount {discountType === 'percentage' ? `(${discountInput}%)` : ''}:</span>
                  <span style={{ fontWeight: '600' }}>-₹{calculatedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: 'var(--primary)' }}>
                <span>Total:</span>
                <span style={{ fontWeight: '700' }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
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

export default InvoiceForm;
