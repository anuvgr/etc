import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';
import client from '../api/client';

const PurchaseForm = ({ onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
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
        console.error('Failed to fetch data', err);
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
        newItems[index].tax_rate = prod.tax_rate;
      }
    }

    newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
  const cgst = isIGST ? 0 : totalTax / 2;
  const sgst = isIGST ? 0 : totalTax / 2;
  const igst = isIGST ? totalTax : 0;
  const total = subtotal + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return alert('Please select a supplier');
    if (items.some(item => !item.product_id)) return alert('Please select products for all rows');

    const payload = {
      supplier_id: selectedSupplier,
      purchase_number: billNumber, // Supplier Bill No
      date: new Date().toISOString().split('T')[0],
      subtotal,
      cgst,
      sgst,
      igst,
      total,
      items,
      status
    };

    try {
      await client.post('/purchases', payload);
      onSuccess();
    } catch (err) {
      alert('Failed to save purchase');
    }
  };

  return ReactDOM.createPortal(
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 
    }}>
      <div className="card glass" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Record New Purchase</h2>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.5rem' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="input-group">
              <label className="label">Supplier</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Search supplier..." 
                value={supplierSearch} 
                onChange={(e) => setSupplierSearch(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <select 
                className="input" 
                value={selectedSupplier} 
                onChange={(e) => setSelectedSupplier(e.target.value)}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.filter(s => 
                   !supplierSearch || 
                   s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || 
                   (s.company_name && s.company_name.toLowerCase().includes(supplierSearch.toLowerCase()))
                ).map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.company_name ? `(${s.company_name})` : ''}</option>
                ))}
              </select>
              
              {selectedSupplier && (() => {
                const s = suppliers.find(sup => sup.id === parseInt(selectedSupplier));
                if (!s) return null;
                return (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.company_name || s.name}</div>
                    <div className="text-muted">{s.address}</div>
                    <div style={{ marginTop: '0.25rem' }}>GSTIN: <span style={{ color: 'var(--text-main)' }}>{s.gstin || 'UNREGISTERED'}</span></div>
                  </div>
                );
              })()}
            </div>
            
            <div className="form-grid" style={{ gap: '1rem' }}>
              <div className="input-group">
                <label className="label">Bill / Purchase No</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Enter Bill No" 
                  value={billNumber} 
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label className="label">Status</label>
                <select 
                  className="input" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial Payment</option>
                </select>
              </div>
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="igst" 
                  checked={isIGST} 
                  onChange={(e) => setIsIGST(e.target.checked)} 
                />
                <label htmlFor="igst" className="label" style={{ marginBottom: 0 }}>Apply IGST</label>
              </div>
            </div>
          </div>

          <table style={{ marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Product/Part</th>
                <th>Quantity</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <select 
                      className="input" 
                      value={item.product_id} 
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.part_number} | {p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input 
                      type="number" className="input" min="1"
                      value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input" 
                      value={item.rate} onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                    />
                  </td>
                  <td style={{ fontWeight: '600' }}>{item.amount.toLocaleString()}</td>
                  <td>
                    <button type="button" onClick={() => removeItem(index)} className="btn" style={{ color: '#ef4444' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={addItem} className="btn btn-outline" style={{ marginBottom: '2rem' }}>
            <Plus size={18} /> Add Row
          </button>

          <div className="form-grid" style={{ alignItems: 'flex-start' }}>
            <div className="card glass" style={{ padding: '1rem' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Notes</p>
              <textarea className="input" style={{ height: '100px', resize: 'none', marginTop: '0.5rem' }} placeholder="Purchase notes..."></textarea>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              {!isIGST && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">CGST</span>
                    <span>₹{cgst.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">SGST</span>
                    <span>₹{sgst.toLocaleString()}</span>
                  </div>
                </>
              )}
              {isIGST && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">IGST</span>
                  <span>₹{igst.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>Total Amount</span>
                <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--primary)' }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Save size={18} /> Record Purchase
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PurchaseForm;
