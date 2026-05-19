import React, { useState, useEffect } from 'react';
import client from '../api/client';
import ReactDOM from 'react-dom';
import { formatDate } from '../utils/format';
import { Search, ChevronRight, ArrowLeft, Plus, CreditCard, X, CheckCircle, Printer } from 'lucide-react';

export default function SupplierLedgerTab() {
  const [suppliers, setsuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', payment_mode: 'Cash', reference_no: '', notes: '' });
  const [receiptForm, setReceiptForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', payment_mode: 'Cheque', bank_name: '', cheque_number: '', reference_no: '', narration: '', status: 'Cleared' });

  useEffect(() => { fetchsuppliers(); }, []);

  const fetchsuppliers = async () => {
    try {
      const { data } = await client.get('/suppliers');
      setsuppliers(data);
    } catch (e) { console.error(e); }
  };

  const openSupplier = async (c) => {
    setSelected(c);
    setLoading(true);
    try {
      const { data } = await client.get(`/suppliers/${c.id}/ledger`);
      setLedger(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = suppliers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Payments to suppliers are tracked via bank_receipts with supplier_id
      await client.post('/bank-receipts', { ...paymentForm, party_name: selected.name, party_type: 'Supplier', supplier_id: selected.id });
      setShowPayment(false);
      setPaymentForm({ date: new Date().toISOString().split('T')[0], amount: '', payment_mode: 'Cash', reference_no: '', notes: '' });
      openSupplier(selected);
    } catch (err) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleSaveReceipt = async (e) => {
    // A receipt from a supplier? Usually it's just payments to them, but we'll allow it as a negative amount if needed, 
    // or just use the same bank_receipts endpoint.
    e.preventDefault();
    setSaving(true);
    try {
      await client.post('/bank-receipts', { ...receiptForm, party_name: selected.name, party_type: 'Supplier', supplier_id: selected.id });
      setShowReceipt(false);
      setReceiptForm({ date: new Date().toISOString().split('T')[0], amount: '', payment_mode: 'Cheque', bank_name: '', cheque_number: '', reference_no: '', narration: '', status: 'Cleared' });
      openSupplier(selected);
    } catch (err) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  if (selected) {
    const openingBalanceRow = ledger?.ledger?.find(t => t.type === 'Opening Balance');
    const openingBalance = openingBalanceRow ? openingBalanceRow.balance : (ledger?.ledger?.[0] ? ledger.ledger[0].balance - (ledger.ledger[0].debit - ledger.ledger[0].credit) : 0);
    const closingBalance = ledger?.closingBalance || 0;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={() => setShowPayment(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Add Payment
            </button>
            <button className="btn btn-outline" onClick={() => setShowReceipt(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} /> Add Receipt
            </button>
            <button className="btn btn-primary" onClick={() => window.open(`/print/supplier-ledger/${selected.id}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.2rem' }}>{selected.name}</h2>
            {selected.company_name && <p className="text-muted" style={{ margin: 0 }}>{selected.company_name}</p>}
          </div>
          
          {ledger && (
            <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', margin: 0 }}>Opening Balance</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: openingBalance > 0 ? '#ef4444' : openingBalance < 0 ? '#10b981' : 'inherit' }}>
                  ₹{Math.abs(openingBalance).toLocaleString()} {openingBalance > 0 ? '(Dr)' : openingBalance < 0 ? '(Cr)' : ''}
                </p>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }}></div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem', margin: 0 }}>Closing Balance</p>
                <p style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: closingBalance > 0 ? '#ef4444' : closingBalance < 0 ? '#10b981' : 'inherit' }}>
                  ₹{Math.abs(closingBalance).toLocaleString()} {closingBalance > 0 ? '(Dr)' : closingBalance < 0 ? '(Cr)' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      <div className="card glass">
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {ledger?.ledger?.map((tx, i) => (
              <tr key={i}>
                <td>{formatDate(tx.date)}</td>
                <td>{tx.type}</td>
                <td>{tx.ref}</td>
                <td style={{ color: '#ef4444' }}>{tx.debit || '—'}</td>
                <td style={{ color: '#10b981' }}>{tx.credit || '—'}</td>
                <td style={{ fontWeight: '700' }}>{tx.balance}</td>
              </tr>
            ))}
          </tbody>
          {ledger && (
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>Closing Balance:</td>
                <td style={{ fontWeight: '800', fontSize: '1.2rem', color: closingBalance > 0 ? '#ef4444' : closingBalance < 0 ? '#10b981' : 'inherit' }}>
                  ₹{Math.abs(closingBalance).toLocaleString()} {closingBalance > 0 ? '(Dr)' : closingBalance < 0 ? '(Cr)' : ''}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showPayment && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass" style={{ width: '400px' }}>
            <h2>Record Payment</h2>
            <form onSubmit={handleSavePayment}>
              <div className="input-group">
                <label className="label">Date</label>
                <input type="date" className="input" required value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Amount</label>
                <input type="number" className="input" required placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Mode</label>
                <select className="input" value={paymentForm.payment_mode} onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value})}>
                  {['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'Bank Transfer', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Reference No.</label>
                <input type="text" className="input" placeholder="Optional" value={paymentForm.reference_no} onChange={e => setPaymentForm({...paymentForm, reference_no: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowPayment(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {showReceipt && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card glass" style={{ width: '400px' }}>
            <h2>Add Bank Receipt</h2>
            <form onSubmit={handleSaveReceipt}>
              <div className="input-group">
                <label className="label">Date</label>
                <input type="date" className="input" required value={receiptForm.date} onChange={e => setReceiptForm({...receiptForm, date: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Amount</label>
                <input type="number" className="input" required placeholder="Amount" value={receiptForm.amount} onChange={e => setReceiptForm({...receiptForm, amount: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Mode</label>
                <select className="input" value={receiptForm.payment_mode} onChange={e => setReceiptForm({...receiptForm, payment_mode: e.target.value})}>
                  {['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'Bank Transfer', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Reference / Cheque No.</label>
                <input type="text" className="input" placeholder="Optional" value={receiptForm.cheque_number} onChange={e => setReceiptForm({...receiptForm, cheque_number: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowReceipt(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
  }

  return (
    <div>
      <input type="text" className="input" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="card glass" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr><th>Supplier</th><th>Company</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => openSupplier(c)} style={{ cursor: 'pointer' }}>
                <td>{c.name}</td>
                <td>{c.company_name}</td>
                <td><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
