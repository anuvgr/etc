import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import ReactDOM from 'react-dom';
import { Users, Plus, Search, Mail, Phone, MapPin, Download, Upload, X, FileText, Printer, MessageCircle, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/format';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    gstin: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await client.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await client.put(`/customers/${editingId}`, formData);
      } else {
        await client.post('/customers', formData);
      }
      setShowModal(false);
      fetchCustomers();
      resetForm();
    } catch (err) {
      alert('Failed to save customer: ' + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', company_name: '', phone: '', email: '', address: '', gstin: '' });
    setEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name,
      company_name: customer.company_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || ''
    });
    setEditingId(customer.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleViewLedger = async (customer) => {
    try {
      setSelectedCustomer(customer);
      setLedgerData(null);
      setShowLedgerModal(true);
      const { data } = await client.get(`/customers/${customer.id}/ledger`);
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      alert('Failed to load ledger: ' + (err.response?.data?.error || err.message));
      setShowLedgerModal(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.print-ledger');
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Statement_${selectedCustomer?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Temporarily hide the 'no-print' buttons for the PDF generation
    const buttons = element.querySelector('.no-print');
    if (buttons) buttons.style.display = 'none';

    html2pdf().set(opt).from(element).save().then(() => {
      if (buttons) buttons.style.display = 'flex';
    });
  };

  const handleWhatsappLedger = () => {
    if (!ledgerData || !selectedCustomer) return;

    let text = `*Statement of Accounts*\n`;
    text += `Customer: *${selectedCustomer.name}*\n`;
    if (selectedCustomer.company_name) text += `Company: ${selectedCustomer.company_name}\n`;
    text += `--------------------------\n`;

    ledgerData.ledger.forEach(tx => {
      text += `${formatDate(tx.date)} | ${tx.type === 'Invoice' ? 'INV' : 'PAY'}: ${tx.ref}\n`;
      if (tx.debit > 0) text += `Dr: ₹${tx.debit.toLocaleString()}\n`;
      if (tx.credit > 0) text += `Cr: ₹${tx.credit.toLocaleString()}\n`;
      text += `Bal: ₹${tx.balance.toLocaleString()}\n\n`;
    });

    text += `--------------------------\n`;
    text += `*Closing Balance: ₹${ledgerData.closingBalance.toLocaleString()} ${ledgerData.closingBalance > 0 ? '(Dr)' : (ledgerData.closingBalance < 0 ? '(Cr)' : '')}*\n`;

    const encodedText = encodeURIComponent(text);
    const phone = selectedCustomer.phone ? selectedCustomer.phone.replace(/\\D/g, '') : '';
    const url = phone ? `https://wa.me/91${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `Customer_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (window.confirm(`Found ${data.length} customers. Proceed with bulk update/import?`)) {
          await client.post('/customers/bulk', data);
          alert('Customer database updated successfully!');
          fetchCustomers();
        }
      } catch (err) {
        alert('Error parsing Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={handleExport} title="Export to Excel">
              <Download size={18} /> Export
            </button>
            <button className="btn btn-outline" onClick={() => fileInputRef.current.click()} title="Import from Excel">
              <Upload size={18} /> Import
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx, .xls"
              onChange={handleImport}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add Customer
        </button>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Customer / Contact</th>
              <th>Company Details</th>
              <th>Contact Info</th>
              <th>GSTIN Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer, index) => (
              <tr key={customer.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td>
                  <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {customer.address?.substring(0, 30)}...
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: '500' }}>{customer.company_name}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Phone size={14} className="text-muted" /> {customer.phone || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Mail size={12} /> {customer.email || 'N/A'}
                  </div>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: customer.gstin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: customer.gstin ? '#10b981' : '#ef4444'
                  }}>
                    {customer.gstin || 'Unregistered'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      onClick={() => handleViewLedger(customer)}
                    >
                      <FileText size={14} style={{ marginRight: '0.25rem' }} /> Ledger
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem', color: 'var(--accent)' }}
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card glass animate-in" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editMode ? 'Edit Customer' : 'Add New Customer'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Contact Person</label>
                <input
                  type="text" className="input" required
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="label">Company Name</label>
                <input
                  type="text" className="input"
                  value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Phone</label>
                  <input
                    type="text" className="input"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="label">Email</label>
                  <input
                    type="email" className="input"
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">GSTIN</label>
                <input
                  type="text" className="input"
                  value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="label">Address</label>
                <textarea
                  className="input" style={{ resize: 'none', height: '80px' }}
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editMode ? 'Update Customer' : 'Save Customer'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showLedgerModal && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-ledger, .print-ledger * { visibility: visible; }
              .print-ledger { position: absolute; left: 0; top: 0; width: 100%; max-width: none; color: black !important; background: white !important; box-shadow: none; max-height: none; overflow: visible; padding: 20px; }
              .print-ledger table { width: 100%; border-collapse: collapse; color: black !important; background: white !important; border: 1px solid #000 !important; }
              .print-ledger th { background: #eee !important; color: black !important; border: 1px solid #000 !important; font-weight: bold; }
              .print-ledger td { border: 1px solid #000 !important; color: black !important; background: white !important; }
              .print-ledger span { background: none !important; color: black !important; padding: 0 !important; font-weight: bold; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="card print-ledger" style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#fff',
            color: '#000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/logo.png" alt="Logo" className="print-only-logo" style={{ height: '60px', marginRight: '1rem', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Statement of Accounts</h2>
                  <div className="text-muted" style={{ color: 'inherit' }}>Customer: <strong>{selectedCustomer?.name}</strong> {selectedCustomer?.company_name && `(${selectedCustomer.company_name})`}</div>
                </div>
              </div>
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={handlePrintLedger} title="Print Statement" style={{ color: '#000', borderColor: '#ccc' }}>
                  <Printer size={18} /> Print
                </button>
                <button className="btn btn-outline" onClick={handleDownloadPDF} title="Save as PDF" style={{ color: '#000', borderColor: '#ccc' }}>
                  <FileText size={18} /> PDF
                </button>
                <button className="btn btn-outline" onClick={handleWhatsappLedger} title="Share via WhatsApp" style={{ color: '#25D366', borderColor: 'rgba(37,211,102,0.5)' }}>
                  <MessageCircle size={18} /> WhatsApp
                </button>
                <button className="btn btn-outline" onClick={() => setShowLedgerModal(false)} style={{ padding: '0.5rem', marginLeft: '1rem', color: '#000', borderColor: '#ccc' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {!ledgerData ? (
              <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">Loading ledger data...</div>
            ) : ledgerData.ledger.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">No transactions found for this customer.</div>
            ) : (
              <>
                <table style={{ marginBottom: '1.5rem', color: '#000', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0' }}>Date</th>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0' }}>Type</th>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0' }}>Ref/Details</th>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0', textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0', textAlign: 'right' }}>Credit (₹)</th>
                      <th style={{ color: '#475569', border: '1px solid #e2e8f0', textAlign: 'right' }}>Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.ledger.map((tx, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #e2e8f0' }}>{formatDate(tx.date)}</td>
                        <td style={{ border: '1px solid #e2e8f0' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: tx.type === 'Invoice' ? '#fee2e2' : '#d1fae5',
                            color: tx.type === 'Invoice' ? '#b91c1c' : '#047857',
                            fontWeight: '600'
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500', border: '1px solid #e2e8f0' }}>{tx.ref}</td>
                        <td style={{ textAlign: 'right', color: tx.debit > 0 ? '#b91c1c' : 'inherit', border: '1px solid #e2e8f0' }}>
                          {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: tx.credit > 0 ? '#047857' : 'inherit', border: '1px solid #e2e8f0' }}>
                          {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                          {tx.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem', border: '1px solid #e2e8f0' }}>Closing Balance:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem', border: '1px solid #e2e8f0', color: ledgerData.closingBalance > 0 ? '#b91c1c' : (ledgerData.closingBalance < 0 ? '#047857' : 'inherit') }}>
                        ₹{ledgerData.closingBalance.toLocaleString()} {ledgerData.closingBalance > 0 ? '(Dr)' : (ledgerData.closingBalance < 0 ? '(Cr)' : '')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Customers;
