import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { Plus, Search, X, CreditCard, Building2, CheckCircle, Trash2, Calendar, RefreshCcw, Users } from 'lucide-react';
import CustomerLedgerTab from '../components/CustomerLedgerTab';

import SupplierLedgerTab from '../components/SupplierLedgerTab';

const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'Bank Transfer', 'Other'];
const PARTY_TYPES = ['Customer', 'Supplier', 'Other'];
const STATUSES = ['Cleared', 'Pending', 'Bounced'];

const emptyPayment = { customer_id: '', invoice_id: '', date: new Date().toISOString().split('T')[0], amount: '', payment_mode: 'Cash', reference_no: '', notes: '' };
const emptyReceipt = { date: new Date().toISOString().split('T')[0], party_name: '', party_type: 'Customer', amount: '', payment_mode: 'Cheque', bank_name: '', cheque_number: '', reference_no: '', narration: '', status: 'Cleared' };

const Ledgers = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [payments, setPayments] = useState([]);
  const [bankReceipts, setBankReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [receiptForm, setReceiptForm] = useState(emptyReceipt);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, cRes] = await Promise.all([
        client.get('/payments'),
        client.get('/bank-receipts'),
        client.get('/customers')
      ]);
      setPayments(pRes.data);
      setBankReceipts(rRes.data);
      setCustomers(cRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadInvoices = async (customerId) => {
    try {
      const { data } = await client.get('/invoices', { params: { all: 'true' } });
      setInvoices(data.filter(i => String(i.customer_id) === String(customerId) && i.status !== 'Paid'));
    } catch (e) { setInvoices([]); }
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/payments', paymentForm);
      setShowPaymentForm(false);
      setPaymentForm(emptyPayment);
      fetchAll();
    } catch (err) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const saveReceipt = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/bank-receipts', receiptForm);
      setShowReceiptForm(false);
      setReceiptForm(emptyReceipt);
      fetchAll();
    } catch (err) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const filteredPayments = payments.filter(p => !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()));
  const filteredReceipts = bankReceipts.filter(r => !search || r.party_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setActiveTab('customers')} className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-outline'}`}>Customer Ledger</button>
          <button onClick={() => setActiveTab('suppliers')} className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-outline'}`}>Supplier Ledger</button>
          <button onClick={() => setActiveTab('payments')} className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline'}`}>Payments</button>
          <button onClick={() => setActiveTab('bank')} className={`btn ${activeTab === 'bank' ? 'btn-primary' : 'btn-outline'}`}>Bank Receipts</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'payments' && <button className="btn btn-primary" onClick={() => setShowPaymentForm(true)}>Record Payment</button>}
          {activeTab === 'bank' && <button className="btn btn-primary" onClick={() => setShowReceiptForm(true)}>Add Receipt</button>}
        </div>
      </div>

      {activeTab === 'customers' && <CustomerLedgerTab />}
      {activeTab === 'suppliers' && <SupplierLedgerTab />}

      {activeTab === 'payments' && (
        <div className="card glass">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Invoice #</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td>{p.customer_name}</td>
                  <td>{p.invoice_number}</td>
                  <td style={{ color: '#10b981' }}>₹{p.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className="card glass">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Party</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(r => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.party_name}</td>
                  <td style={{ color: '#10b981' }}>₹{r.amount.toLocaleString()}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentForm && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass" style={{ width: '400px' }}>
            <h2>Record Payment</h2>
            <form onSubmit={savePayment}>
              <select className="input" required value={paymentForm.customer_id} onChange={(e) => {
                const id = e.target.value;
                setPaymentForm({...paymentForm, customer_id: id, invoice_id: ''});
                if (id) loadInvoices(id);
              }}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {paymentForm.customer_id && (
                <select className="input" required value={paymentForm.invoice_id} onChange={(e) => {
                  const invId = e.target.value;
                  const inv = invoices.find(i => String(i.id) === String(invId));
                  setPaymentForm({
                    ...paymentForm, 
                    invoice_id: invId,
                    amount: inv ? inv.total : ''
                  });
                }}>
                  <option value="">Select Invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} (₹{inv.total.toLocaleString()} - {inv.status})
                    </option>
                  ))}
                </select>
              )}
              <input type="number" className="input" required placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentForm(emptyPayment);
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Ledgers;
