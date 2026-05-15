import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import client from '../api/client';
import { Truck, Plus, Search, Mail, Phone, MapPin, Download, Upload, X, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
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
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await client.get('/suppliers');
      setSuppliers(data);
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
        await client.put(`/suppliers/${editingId}`, formData);
      } else {
        await client.post('/suppliers', formData);
      }
      setShowModal(false);
      fetchSuppliers();
      resetForm();
    } catch (err) {
      alert('Failed to save supplier');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', company_name: '', phone: '', email: '', address: '', gstin: '' });
    setEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      company_name: supplier.company_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstin: supplier.gstin || ''
    });
    setEditingId(supplier.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(suppliers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, `Suppliers_List_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        if (window.confirm(`Found ${data.length} suppliers. Proceed with bulk update/import?`)) {
          await client.post('/suppliers/bulk', data);
          alert('Suppliers updated successfully!');
          fetchSuppliers();
        }
      } catch (err) {
        alert('Error parsing Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase())
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
              placeholder="Search suppliers..."
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
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Supplier / Contact</th>
              <th>Company Details</th>
              <th>Contact Info</th>
              <th>GSTIN Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((supplier, index) => (
              <tr key={supplier.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td>
                  <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{supplier.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {supplier.address?.substring(0, 30)}...
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: '500' }}>{supplier.company_name}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Phone size={14} className="text-muted" /> {supplier.phone || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Mail size={12} /> {supplier.email || 'N/A'}
                  </div>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: supplier.gstin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: supplier.gstin ? '#10b981' : '#ef4444'
                  }}>
                    {supplier.gstin || 'Unregistered'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>History</button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem', color: 'var(--accent)' }}
                      onClick={() => handleEdit(supplier)}
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
          <div className="card glass" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editMode ? 'Edit Supplier' : 'Add New Supplier'}</h2>
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
                  {editMode ? 'Update Supplier' : 'Save Supplier'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Suppliers;
