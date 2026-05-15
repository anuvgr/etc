import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { Plus, Search, X, CreditCard, Building2, CheckCircle, Trash2, Calendar, RefreshCcw, Users } from 'lucide-react';
import CustomerLedgerTab from '../components/CustomerLedgerTab';

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => { fetchAll(); }, [fromDate, toDate]);

  const fetchAll = async () => {
    setLoading(true);
    const params = fromDate && toDate ? { from: fromDate, to: toDate } : {};
    try {
      const [pRes, brRes, cRes, fyRes] = await Promise.all([
        client.get('/payments', { params }),
        client.get('/bank-receipts', { params }),
        client.get('/customers'),
        client.get('/financial-years'),
      ]);
      setPayments(pRes.data);
      setBankReceipts(brRes.data);
      setCustomers(cRes.data);
      if (!fromDate && !toDate) {
        const active = fyRes.data.find(f => f.is_active);
        if (active) { setFromDate(active.start_date); setToDate(active.end_date); }
      }
      if (paymentForm.customer_id) {
        const iRes = await client.get('/invoices', { params: { all: 'true' } });
        setInvoices(iRes.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadInvoices = async (customerId) => {
    try {
      const { data } = await client.get('/invoices', { params: { all: 'true' } });
      setInvoices(data.filter(i => 
        String(i.customer_id) === String(customerId) && i.status !== 'Paid'
      ));
    } catch (e) { setInvoices([]); }
  };

  const handlePaymentCustomer = (e) => {
    const id = e.target.value;
    setPaymentForm(f => ({ ...f, customer_id: id, invoice_id: '' }));
    if (id) loadInvoices(id);
    else setInvoices([]);
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/payments', paymentForm);
      setShowPaymentForm(false);
      setPaymentForm(emptyPayment);
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || 'Save failed'); }
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
    } catch (err) { alert(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteReceipt = async (id) => {
    if (!confirm('Delete this bank receipt?')) return;
    try { await client.delete(`/bank-receipts/${id}`); fetchAll(); }
    catch (e) { alert('Delete failed'); }
  };

  const filteredPayments = payments.filter(p =>
    !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_mode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReceipts = bankReceipts.filter(r =>
    !search || r.party_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.payment_mode?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayments = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalReceipts = filteredReceipts.reduce((s, r) => s + (r.amount || 0), 0);

  const badgeStyle = (val) => ({
    padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700',
    background: val === 'Cleared' ? 'rgba(16,185,129,0.15)' : val === 'Pending' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
    color: val === 'Cleared' ? '#10b981' : val === 'Pending' ? '#f59e0b' : '#ef4444'
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[['customers', Users, 'Customer Ledger'], ['payments', CreditCard, 'Payments Received'], ['bank', Building2, 'Bank Receipts']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => { setActiveTab(id); setSearch(''); }}
              className={`btn ${activeTab === id ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Calendar size={15} className="text-muted" />
            <input type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '120px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>to</span>
            <input type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '120px' }} value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={fetchAll} title="Refresh"><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
          {activeTab === 'payments' && <button className="btn btn-primary" onClick={() => setShowPaymentForm(true)}><Plus size={16} /> Record Payment</button>}
          {activeTab === 'bank' && <button className="btn btn-primary" onClick={() => setShowReceiptForm(true)}><Plus size={16} /> Add Bank Receipt</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {activeTab === 'payments' ? <>
          <div className="stat-card glass" style={{ borderLeft: '3px solid #10b981', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Total Received</span>
            <span style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: '800' }}>₹{totalPayments.toLocaleString()}</span>
          </div>
          <div className="stat-card glass" style={{ borderLeft: '3px solid var(--primary)', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Transactions</span>
            <span style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: '800' }}>{filteredPayments.length}</span>
          </div>
          <div className="stat-card glass" style={{ borderLeft: '3px solid #3b82f6', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Avg. Payment</span>
            <span style={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: '800' }}>₹{filteredPayments.length ? Math.round(totalPayments / filteredPayments.length).toLocaleString() : 0}</span>
          </div>
        </> : <>
          <div className="stat-card glass" style={{ borderLeft: '3px solid #10b981', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Total Receipts</span>
            <span style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: '800' }}>₹{totalReceipts.toLocaleString()}</span>
          </div>
          <div className="stat-card glass" style={{ borderLeft: '3px solid #f59e0b', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Pending</span>
            <span style={{ color: '#f59e0b', fontSize: '1.1rem', fontWeight: '800' }}>{filteredReceipts.filter(r => r.status === 'Pending').length}</span>
          </div>
          <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.6rem 1rem' }}>
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Bounced</span>
            <span style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: '800' }}>{filteredReceipts.filter(r => r.status === 'Bounced').length}</span>
          </div>
        </>}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: '320px', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Customer Ledger Tab */}
      {activeTab === 'customers' && <CustomerLedgerTab />}

      {/* Payments Received Tab */}
      {activeTab === 'payments' && (
        <div className="card glass animate-in">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Customer</th><th>Invoice #</th><th>Mode</th><th>Reference</th><th>Amount</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                  <td>{formatDate(p.date)}</td>
                  <td style={{ fontWeight: '600' }}>{p.customer_name || '—'}</td>
                  <td style={{ color: 'var(--primary)' }}>{p.invoice_number || '—'}</td>
                  <td><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: '600' }}>{p.payment_mode}</span></td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>{p.reference_no || '—'}</td>
                  <td style={{ fontWeight: '700', color: '#10b981' }}>₹{(p.amount || 0).toLocaleString()}</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                </tr>
              ))}
              {!loading && filteredPayments.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No payments found for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bank Receipts Tab */}
      {activeTab === 'bank' && (
        <div className="card glass animate-in">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Receipt #</th><th>Date</th><th>Party</th><th>Type</th><th>Mode</th><th>Bank / Cheque</th><th>Status</th><th>Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{r.receipt_number}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{r.party_name}</div>
                    {r.narration && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.narration}</div>}
                  </td>
                  <td><span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{r.party_type}</span></td>
                  <td>{r.payment_mode}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {r.bank_name && <div>{r.bank_name}</div>}
                    {r.cheque_number && <div className="text-muted">#{r.cheque_number}</div>}
                    {r.reference_no && !r.cheque_number && <div className="text-muted">{r.reference_no}</div>}
                  </td>
                  <td><span style={badgeStyle(r.status)}>{r.status}</span></td>
                  <td style={{ fontWeight: '700', color: '#10b981' }}>₹{(r.amount || 0).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '0.3rem' }} onClick={() => deleteReceipt(r.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {!loading && filteredReceipts.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No bank receipts found for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={20} /> Record Payment Received</h3>
              <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => setShowPaymentForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={savePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Customer *</label>
                <select className="input" required value={paymentForm.customer_id} onChange={handlePaymentCustomer}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `— ${c.company_name}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Against Invoice</label>
                <select className="input" value={paymentForm.invoice_id} onChange={e => setPaymentForm(f => ({ ...f, invoice_id: e.target.value }))}>
                  <option value="">General Payment (No Invoice)</option>
                  {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — ₹{i.total?.toLocaleString()} ({i.status})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Date *</label>
                  <input type="date" className="input" required value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Amount (₹) *</label>
                  <input type="number" className="input" required min="0" step="0.01" placeholder="0.00" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Payment Mode *</label>
                  <select className="input" required value={paymentForm.payment_mode} onChange={e => setPaymentForm(f => ({ ...f, payment_mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Reference No.</label>
                  <input type="text" className="input" placeholder="Cheque / UTR / Ref No." value={paymentForm.reference_no} onChange={e => setPaymentForm(f => ({ ...f, reference_no: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Notes</label>
                <textarea className="input" rows={2} placeholder="Optional notes..." value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><CheckCircle size={16} /> {saving ? 'Saving...' : 'Save Payment'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bank Receipt Form Modal */}
      {showReceiptForm && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20} /> Add Bank Receipt</h3>
              <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => setShowReceiptForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Date *</label>
                  <input type="date" className="input" required value={receiptForm.date} onChange={e => setReceiptForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Amount (₹) *</label>
                  <input type="number" className="input" required min="0" step="0.01" placeholder="0.00" value={receiptForm.amount} onChange={e => setReceiptForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Party Name *</label>
                  <input type="text" className="input" required placeholder="Customer / Supplier name" value={receiptForm.party_name} onChange={e => setReceiptForm(f => ({ ...f, party_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Party Type</label>
                  <select className="input" value={receiptForm.party_type} onChange={e => setReceiptForm(f => ({ ...f, party_type: e.target.value }))}>
                    {PARTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Payment Mode *</label>
                  <select className="input" required value={receiptForm.payment_mode} onChange={e => setReceiptForm(f => ({ ...f, payment_mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Status</label>
                  <select className="input" value={receiptForm.status} onChange={e => setReceiptForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Bank Name</label>
                  <input type="text" className="input" placeholder="e.g. SBI, HDFC" value={receiptForm.bank_name} onChange={e => setReceiptForm(f => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Cheque Number</label>
                  <input type="text" className="input" placeholder="Cheque / DD number" value={receiptForm.cheque_number} onChange={e => setReceiptForm(f => ({ ...f, cheque_number: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Reference / UTR No.</label>
                <input type="text" className="input" placeholder="NEFT / RTGS / UPI ref" value={receiptForm.reference_no} onChange={e => setReceiptForm(f => ({ ...f, reference_no: e.target.value }))} />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Narration</label>
                <textarea className="input" rows={2} placeholder="Being payment received for..." value={receiptForm.narration} onChange={e => setReceiptForm(f => ({ ...f, narration: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowReceiptForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><CheckCircle size={16} /> {saving ? 'Saving...' : 'Save Receipt'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Ledgers;
