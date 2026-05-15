import React, { useState, useEffect } from 'react';
import client from '../api/client';
import ReactDOM from 'react-dom';
import { formatDate } from '../utils/format';
import { Search, ChevronRight, ArrowLeft, Plus, CreditCard, X, CheckCircle, Phone, Mail, MapPin, Building2 } from 'lucide-react';

const MODES = ['Cash','Cheque','NEFT','RTGS','UPI','Bank Transfer','Other'];
const today = () => new Date().toISOString().split('T')[0];

export default function CustomerLedgerTab() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('payment'); // 'payment' | 'receipt'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await client.get('/customers');
      setCustomers(data);
    } catch (e) { console.error(e); }
  };

  const openCustomer = async (c) => {
    setSelected(c);
    setLedger(null);
    setLoading(true);
    try {
      const [ledRes, invRes] = await Promise.all([
        client.get(`/customers/${c.id}/ledger`),
        client.get('/invoices', { params: { all: 'true' } })
      ]);
      setLedger(ledRes.data);
      setInvoices(invRes.data.filter(i => 
        String(i.customer_id) === String(c.id) && i.status !== 'Paid'
      ));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openForm = (type) => {
    setFormType(type);
    if (type === 'payment') {
      setForm({ customer_id: selected.id, invoice_id: '', date: today(), amount: '', payment_mode: 'Cash', reference_no: '', notes: '' });
    } else {
      setForm({ date: today(), party_name: selected.name, party_type: 'Customer', customer_id: selected.id, amount: '', payment_mode: 'Cheque', bank_name: '', cheque_number: '', reference_no: '', narration: '', status: 'Cleared' });
    }
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formType === 'payment') await client.post('/payments', form);
      else await client.post('/bank-receipts', form);
      setShowForm(false);
      openCustomer(selected);
    } catch (err) { alert(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const bal = ledger?.closingBalance || 0;

  if (selected) return (
    <div className="animate-in">
      {/* Back bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <button className="btn btn-outline" style={{ padding:'0.5rem 1rem' }} onClick={() => { setSelected(null); setLedger(null); }}>
            <ArrowLeft size={16} /> All Customers
          </button>
          <div>
            <div style={{ fontWeight:'800', fontSize:'1.1rem' }}>{selected.name}</div>
            {selected.company_name && <div className="text-muted" style={{ fontSize:'0.8rem' }}>{selected.company_name}</div>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <div className="stat-card glass" style={{ padding:'0.5rem 1rem', borderLeft:`3px solid ${bal>0?'#ef4444':'#10b981'}` }}>
            <span className="text-muted" style={{ fontSize:'0.7rem' }}>Balance</span>
            <span style={{ fontWeight:'800', color:bal>0?'#ef4444':'#10b981' }}>₹{Math.abs(bal).toLocaleString()} {bal>0?'Dr':'Cr'}</span>
          </div>
          <button className="btn btn-outline" style={{ fontSize:'0.8rem' }} onClick={() => openForm('receipt')}>
            <Building2 size={15} /> Bank Receipt
          </button>
          <button className="btn btn-primary" style={{ fontSize:'0.8rem' }} onClick={() => openForm('payment')}>
            <Plus size={15} /> Record Payment
          </button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="card glass" style={{ marginBottom:'1.5rem', padding:'1rem', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem' }}>
        {selected.phone && <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem' }}><Phone size={14} className="text-muted" />{selected.phone}</div>}
        {selected.email && <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem' }}><Mail size={14} className="text-muted" />{selected.email}</div>}
        {selected.address && <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem' }}><MapPin size={14} className="text-muted" />{selected.address}</div>}
        {selected.gstin && <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem' }}><span style={{ padding:'0.2rem 0.5rem', borderRadius:'4px', background:'rgba(16,185,129,0.1)', color:'#10b981', fontWeight:'700', fontSize:'0.75rem' }}>{selected.gstin}</span></div>}
      </div>

      {/* Ledger Table */}
      <div className="card glass">
        <h3 style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <CreditCard size={18} className="text-primary" /> Ledger Statement
        </h3>
        {loading ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>Loading ledger...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Reference</th>
                <th style={{ textAlign:'right' }}>Debit (₹)</th>
                <th style={{ textAlign:'right' }}>Credit (₹)</th>
                <th style={{ textAlign:'right' }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.ledger?.map((tx, i) => (
                <tr key={i}>
                  <td>{formatDate(tx.date)}</td>
                  <td>
                    <span style={{ padding:'0.15rem 0.5rem', borderRadius:'4px', fontSize:'0.72rem', fontWeight:'700',
                      background: tx.type==='Invoice'?'rgba(239,68,68,0.1)': tx.type==='Opening Balance'?'rgba(99,102,241,0.1)':'rgba(16,185,129,0.1)',
                      color: tx.type==='Invoice'?'#ef4444': tx.type==='Opening Balance'?'#6366f1':'#10b981' }}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ fontWeight:'500' }}>{tx.ref}</td>
                  <td style={{ textAlign:'right', color:'#ef4444' }}>{tx.debit>0 ? tx.debit.toLocaleString() : '—'}</td>
                  <td style={{ textAlign:'right', color:'#10b981' }}>{tx.credit>0 ? tx.credit.toLocaleString() : '—'}</td>
                  <td style={{ textAlign:'right', fontWeight:'700', color:tx.balance>0?'#ef4444':tx.balance<0?'#10b981':'inherit' }}>
                    {Math.abs(tx.balance).toLocaleString()} {tx.balance>0?'Dr':tx.balance<0?'Cr':''}
                  </td>
                </tr>
              ))}
              {!loading && !ledger?.ledger?.length && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No transactions found.</td></tr>
              )}
            </tbody>
            {ledger?.closingBalance !== undefined && (
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>
                  <td colSpan={5} style={{ textAlign:'right', fontWeight:'800', padding:'0.75rem' }}>Closing Balance:</td>
                  <td style={{ textAlign:'right', fontWeight:'900', fontSize:'1rem', padding:'0.75rem',
                    color: bal>0?'#ef4444':bal<0?'#10b981':'inherit' }}>
                    ₹{Math.abs(bal).toLocaleString()} {bal>0?'(Dr)':bal<0?'(Cr)':''}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Entry Modal */}
      {showForm && ReactDOM.createPortal(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding: '1rem' }}>
          <div className="card glass" style={{ width:'100%', maxWidth:'480px', maxHeight:'90vh', overflowY:'auto', padding:'2rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <h3>{formType==='payment' ? '💳 Record Payment' : '🏦 Add Bank Receipt'}</h3>
              <button className="btn btn-outline" style={{ padding:'0.4rem' }} onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {formType==='payment' ? <>
                <div>
                  <label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Against Invoice</label>
                  <select className="input" value={form.invoice_id} onChange={f('invoice_id')}>
                    <option value="">General Payment</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — ₹{i.total?.toLocaleString()} ({i.status})</option>)}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Date *</label>
                    <input type="date" className="input" required value={form.date} onChange={f('date')}/></div>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Amount (₹) *</label>
                    <input type="number" className="input" required min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={f('amount')}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Mode *</label>
                    <select className="input" required value={form.payment_mode} onChange={f('payment_mode')}>
                      {MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Reference No.</label>
                    <input type="text" className="input" placeholder="Cheque/UTR" value={form.reference_no} onChange={f('reference_no')}/></div>
                </div>
                <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Notes</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={f('notes')}/></div>
              </> : <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Date *</label>
                    <input type="date" className="input" required value={form.date} onChange={f('date')}/></div>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Amount (₹) *</label>
                    <input type="number" className="input" required min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={f('amount')}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Mode *</label>
                    <select className="input" required value={form.payment_mode} onChange={f('payment_mode')}>
                      {MODES.map(m=><option key={m}>{m}</option>)}</select></div>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Status</label>
                    <select className="input" value={form.status} onChange={f('status')}>
                      {['Cleared','Pending','Bounced'].map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Bank Name</label>
                    <input type="text" className="input" placeholder="e.g. SBI, HDFC" value={form.bank_name} onChange={f('bank_name')}/></div>
                  <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Cheque No.</label>
                    <input type="text" className="input" placeholder="Cheque / DD No." value={form.cheque_number} onChange={f('cheque_number')}/></div>
                </div>
                <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Reference / UTR</label>
                  <input type="text" className="input" placeholder="NEFT/RTGS/UPI ref" value={form.reference_no} onChange={f('reference_no')}/></div>
                <div><label className="text-muted" style={{ fontSize:'0.8rem', fontWeight:'600' }}>Narration</label>
                  <textarea className="input" rows={2} value={form.narration} onChange={f('narration')}/></div>
              </>}
              <div style={{ display:'flex', gap:'1rem', justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <CheckCircle size={16}/> {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <div className="animate-in">
      <div style={{ position:'relative', width:'320px', marginBottom:'1.5rem' }}>
        <Search size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input type="text" className="input" style={{ paddingLeft:'2.5rem' }} placeholder="Search customers..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="card glass">
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Company</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => openCustomer(c)}>
                <td style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>{i+1}</td>
                <td>
                  <div style={{ fontWeight:'700', color:'var(--primary)' }}>{c.name}</div>
                  {c.address && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'0.25rem' }}><MapPin size={11}/>{c.address.substring(0,35)}{c.address.length>35?'...':''}</div>}
                </td>
                <td style={{ fontWeight:'500' }}>{c.company_name || '—'}</td>
                <td style={{ fontSize:'0.875rem' }}>{c.phone || '—'}</td>
                <td style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>{c.email || '—'}</td>
                <td>
                  <span style={{ padding:'0.15rem 0.5rem', borderRadius:'4px', fontSize:'0.72rem', fontWeight:'700',
                    background:c.gstin?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)',
                    color:c.gstin?'#10b981':'#ef4444' }}>
                    {c.gstin || 'Unregistered'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline" style={{ padding:'0.4rem 0.8rem', fontSize:'0.75rem' }} onClick={e=>{e.stopPropagation();openCustomer(c);}}>
                    View Ledger <ChevronRight size={13}/>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
