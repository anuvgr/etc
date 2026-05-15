import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';
import client from '../api/client';

const InvoiceForm = ({ type = 'invoice', onClose, onSuccess, initialData = null }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, rate: 0, tax_rate: 18, amount: 0 }]);
  const [isIGST, setIsIGST] = useState(false);
  const [status, setStatus] = useState(type === 'invoice' ? 'Pending' : 'Open');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'

  useEffect(() => {
    const fetchData = async () => {
      const [custRes, prodRes] = await Promise.all([
        client.get('/customers'),
        client.get('/products')
      ]);
      setCustomers(custRes.data);
      setProducts(prodRes.data);

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
        setSameAsBilling(!initialData.delivery_address);
        setDiscount(initialData.discount || 0);
      }
    };
    fetchData();
  }, [initialData]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
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
        newItems[index].rate = prod.sales_price || prod.price || 0;
        newItems[index].tax_rate = prod.tax_rate;
      }
    }

    newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    setItems(newItems);
  };

  useEffect(() => {
    if (sameAsBilling && selectedCustomer) {
      const cust = customers.find(c => c.id === parseInt(selectedCustomer));
      if (cust) {
        setDeliveryAddress(cust.address || '');
      }
    }
  }, [selectedCustomer, sameAsBilling, customers]);

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  // Simple GST Logic: 
  // If IGST is true, use total IGST. 
  // Else, split into CGST and SGST (half of total tax).
  const totalTax = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0);
  const cgst = isIGST ? 0 : totalTax / 2;
  const sgst = isIGST ? 0 : totalTax / 2;
  const igst = isIGST ? totalTax : 0;
  const discountAmount = discountType === 'percent'
    ? (subtotal * (parseFloat(discount) || 0)) / 100
    : parseFloat(discount) || 0;
  const total = subtotal + totalTax - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return alert('Please select a customer');
    if (items.some(item => !item.product_id)) return alert('Please select products for all rows');

    const payload = {
      customer_id: selectedCustomer,
      date: new Date().toISOString().split('T')[0],
      subtotal,
      cgst,
      sgst,
      igst,
      total,
      items,
      status,
      delivery_address: deliveryAddress,
      discount: discountAmount,
      quotation_id: type === 'invoice' && initialData ? (initialData.quote_number ? initialData.id : initialData.quotation_id) : null
    };

    try {
      const endpoint = type === 'invoice' ? '/invoices' : '/quotations';
      await client.post(endpoint, payload);
      onSuccess();
    } catch (err) {
      alert('Failed to save ' + type);
    }
  };

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '900px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Create New {type === 'invoice' ? 'Invoice' : 'Quotation'}</h2>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.5rem' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '2rem' }}>
            <div className="input-group">
              <label className="label">Customer</label>
              <input
                type="text"
                className="input"
                placeholder="Search customer by name or company..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <select
                className="input"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                required
              >
                <option value="">Select Customer</option>
                {customers.filter(c =>
                  !customerSearch ||
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  (c.company_name && c.company_name.toLowerCase().includes(customerSearch.toLowerCase()))
                ).map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-grid" style={{ gap: '1rem' }}>
              <div className="input-group">
                <label className="label">Payment Status</label>
                <select
                  className="input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {type === 'invoice' ? (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                      <option value="Paid">Paid</option>
                    </>
                  ) : (
                    <>
                      <option value="Open">Open</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Declined">Declined</option>
                    </>
                  )}
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

          <div className="card glass" style={{ marginBottom: '2rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Delivery Details</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={sameAsBilling} 
                  onChange={(e) => setSameAsBilling(e.target.checked)} 
                />
                Same as Billing Address
              </label>
            </div>
            {!sameAsBilling && (
              <div className="animate-in">
                <textarea
                  className="input"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="Enter separate delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required={!sameAsBilling}
                ></textarea>
              </div>
            )}
            {sameAsBilling && selectedCustomer && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '4px' }}>
                <strong>Shipping to:</strong> {deliveryAddress || 'No billing address found for this customer.'}
              </div>
            )}
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
                    {(() => {
                      const p = item.product_id ? products.find(prod => prod.id === parseInt(item.product_id)) : null;
                      if (p && p.purchase_price > item.rate) {
                        return (
                          <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.25rem', whiteSpace: 'nowrap' }}>
                            Low Price (Cost: ₹{p.purchase_price})
                          </div>
                        );
                      }
                      return null;
                    })()}
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
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Notes / Terms</p>
              <textarea className="input" style={{ height: '100px', resize: 'none', marginTop: '0.5rem' }} placeholder="Enter terms and conditions..."></textarea>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="text-muted">Discount</span>
                  {/* Toggle ₹ / % */}
                  <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('flat'); setDiscount(0); }}
                      style={{
                        padding: '0.2rem 0.5rem', border: 'none', cursor: 'pointer',
                        background: discountType === 'flat' ? 'var(--primary)' : 'transparent',
                        color: discountType === 'flat' ? '#000' : 'var(--text-muted)',
                        fontWeight: '700'
                      }}
                    >₹</button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('percent'); setDiscount(0); }}
                      style={{
                        padding: '0.2rem 0.5rem', border: 'none', cursor: 'pointer',
                        background: discountType === 'percent' ? 'var(--primary)' : 'transparent',
                        color: discountType === 'percent' ? '#000' : 'var(--text-muted)',
                        fontWeight: '700'
                      }}
                    >%</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '100px', textAlign: 'right', padding: '0.25rem' }}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    placeholder={discountType === 'percent' ? '0%' : '0'}
                  />
                  {discountType === 'percent' && parseFloat(discount) > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      = ₹{discountAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>Total Amount</span>
                <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--primary)' }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Save size={18} /> Save {type === 'invoice' ? 'Invoice' : 'Quotation'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceForm;
