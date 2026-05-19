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

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search suppliers..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(supplier => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.company_name}</td>
                <td>{supplier.phone}</td>
                <td>
                  <button className="btn btn-outline" onClick={() => handleEdit(supplier)}><Edit size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '500px' }}>
            <h2>{editMode ? 'Edit' : 'Add'} Supplier</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Name</label>
                <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Company</label>
                <input type="text" className="input" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Phone</label>
                <input type="text" className="input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Address</label>
                <textarea className="input" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows="3" />
              </div>
              <div className="input-group">
                <label className="label">GSTIN</label>
                <input type="text" className="input" value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1 }}>Cancel</button>
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
