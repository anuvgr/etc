import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import ReactDOM from 'react-dom';
import { Package, Plus, Search, AlertTriangle, Download, Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Part');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    hsn_code: '',
    unit: 'Nos',
    purchase_price: '',
    sales_price: '',
    tax_rate: 18,
    stock: '',
    category: 'Part'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await client.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Frontend: Attempting to save product', formData);
    try {
      const response = await client.post('/products', formData);
      console.log('Frontend: Save successful', response.data);
      setShowModal(false);
      fetchProducts();
      setFormData({ name: '', part_number: '', hsn_code: '', unit: 'Nos', purchase_price: '', sales_price: '', tax_rate: 18, stock: '', category: activeTab });
    } catch (err) {
      console.error('Frontend: Save failed', err);
      alert('Failed to add product: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        if (window.confirm(`Found ${data.length} items. Proceed with bulk update/import?`)) {
          await client.post('/products/bulk', data);
          alert('Inventory updated successfully!');
          fetchProducts();
        }
      } catch (err) {
        alert('Error parsing Excel file. Please ensure it follows the correct format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.part_number.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = (p.category || 'Part') === activeTab;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '10px' }}>
          {['Part', 'JCB', 'Hitachi', 'Sany', 'Kobelco', 'Yanmar', 'Other'].map(cat => (
            <button
              key={cat}
              className={`btn ${activeTab === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(cat)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', minWidth: '90px' }}
            >
              {cat === 'Part' ? 'Construction Parts' : cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={handleExport} title="Export to Excel">
            Export
          </button>
          <button className="btn btn-primary" onClick={() => {
            setFormData(prev => ({ ...prev, category: activeTab }));
            setShowModal(true);
          }}>
            Add {activeTab === 'Part' ? 'Part' : activeTab}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '400px' }}>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '1rem' }}
              placeholder={`Search in ${activeTab === 'Part' ? 'Parts' : 'Machines'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" onClick={() => fileInputRef.current.click()} title="Import from Excel">
            Import Excel
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

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>HSN</th>
              <th>Purchase Price</th>
              <th>Sales Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <tr key={product.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{product.part_number}</td>
                <td>
                  <div>{product.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit: {product.unit}</div>
                </td>
                <td>{product.hsn_code}</td>
                <td>₹{product.purchase_price.toLocaleString()}</td>
                <td style={{ fontWeight: '700' }}>₹{product.sales_price.toLocaleString()}</td>
                <td>
                  <span style={{
                    fontWeight: '700',
                    color: product.stock <= 5 ? '#ef4444' : 'inherit'
                  }}>
                    {product.stock}
                  </span>
                </td>
                <td>
                  {product.stock <= 5 ? (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                      <AlertTriangle size={14} /> Low Stock
                    </span>
                  ) : (
                    <span style={{ color: '#10b981', fontSize: '0.75rem' }}>In Stock</span>
                  )}
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
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Add {formData.category === 'Part' ? 'Construction Part' : 'Machine Asset'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Part Number (Unique)</label>
                  <input
                    type="text" className="input" required
                    value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="label">HSN Code</label>
                  <input
                    type="text" className="input" required
                    value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Item Category / Brand</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                  {['Part', 'JCB', 'Hitachi', 'Sany', 'Kobelco', 'Yanmar', 'Other'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`btn ${formData.category === cat ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', minWidth: '80px' }}
                    >
                      {cat === 'Part' ? 'Construction Part' : cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="label">Product Description</label>
                <input
                  type="text" className="input" required
                  placeholder={formData.category !== 'Part' ? `e.g. ${formData.category} Excavator Filter` : 'e.g. Hydraulic Seal Kit'}
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Purchase Price</label>
                  <input
                    type="number" className="input" required
                    value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="label">Sales Price</label>
                  <input
                    type="number" className="input" required
                    value={formData.sales_price} onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="label">Stock Level</label>
                  <input
                    type="number" className="input" required
                    value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Product</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Products;
