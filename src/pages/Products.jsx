import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import ReactDOM from 'react-dom';
import { Package, Plus, Search, AlertTriangle, Download, Upload, X } from 'lucide-react';
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
      setLoading(true);
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
    try {
      await client.post('/products', formData);
      setShowModal(false);
      fetchProducts();
      setFormData({ name: '', part_number: '', hsn_code: '', unit: 'Nos', purchase_price: '', sales_price: '', tax_rate: 18, stock: '', category: activeTab });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save product');
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
        alert('Error parsing Excel file.');
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '10px' }}>
          {['Part', 'JCB', 'Hitachi', 'Sany', 'Kobelco', 'Yanmar', 'Other'].map(cat => (
            <button
              key={cat}
              className={`btn ${activeTab === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(cat)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={handleExport}>Export</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add {activeTab}</button>
        </div>
      </div>

      <div className="card glass">
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search items..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td style={{ fontWeight: '600' }}>{product.part_number}</td>
                <td>{product.name}</td>
                <td>{product.stock}</td>
                <td>
                  {product.stock <= 5 ? <span style={{ color: '#ef4444' }}>Low Stock</span> : <span style={{ color: '#10b981' }}>In Stock</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Add {activeTab}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Part Number</label>
                <input type="text" className="input" required value={formData.part_number} onChange={(e) => setFormData({...formData, part_number: e.target.value, category: activeTab})} />
              </div>
              <div className="input-group">
                <label className="label">Description</label>
                <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">HSN</label>
                  <input type="text" className="input" required value={formData.hsn_code} onChange={(e) => setFormData({...formData, hsn_code: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="label">Stock</label>
                  <input type="number" className="input" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
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
