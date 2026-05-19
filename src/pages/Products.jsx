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
  
  const normalizeHeaders = (row) => {
    const normalized = {};
    const mappings = {
      part_number: ['part_number', 'part number', 'partno', 'pn', 'part_no', 'part #'],
      name: ['name', 'description', 'item description', 'item', 'item_description', 'title'],
      hsn_code: ['hsn_code', 'hsn code', 'hsn', 'hsn_no', 'hsn number'],
      unit: ['unit', 'uom', 'measure'],
      purchase_price: ['purchase_price', 'purchase price', 'rate', 'purchase rate', 'buying price', 'buy price', 'cost'],
      sales_price: ['sales_price', 'sales price', 'selling price', 'selling rate', 'price', 'sell price', 'sales rate'],
      tax_rate: ['tax_rate', 'tax', 'tax rate', 'gst', 'gst rate', 'tax_%', 'gst_%'],
      stock: ['stock', 'quantity', 'qty', 'initial stock', 'opening stock', 'stock quantity'],
      category: ['category', 'type', 'group']
    };

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = String(key).toLowerCase().trim().replace(/[\s_-]+/g, '_');
      let matched = false;
      
      for (const [dbKey, aliases] of Object.entries(mappings)) {
        if (aliases.includes(cleanKey) || aliases.some(alias => cleanKey.includes(alias.replace(/[\s_-]+/g, '_')))) {
          normalized[dbKey] = value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        normalized[cleanKey] = value;
      }
    }
    
    // Normalize data types and set fallbacks
    if (normalized.part_number !== undefined) normalized.part_number = String(normalized.part_number).trim();
    if (normalized.name !== undefined) normalized.name = String(normalized.name).trim();
    if (normalized.hsn_code !== undefined) normalized.hsn_code = String(normalized.hsn_code).trim();
    
    normalized.stock = normalized.stock !== undefined ? (Number(normalized.stock) || 0) : 0;
    normalized.purchase_price = normalized.purchase_price !== undefined ? (Number(normalized.purchase_price) || 0) : 0;
    normalized.sales_price = normalized.sales_price !== undefined ? (Number(normalized.sales_price) || 0) : 0;
    normalized.tax_rate = normalized.tax_rate !== undefined ? (Number(normalized.tax_rate) || 18) : 18;
    
    if (!normalized.unit) normalized.unit = 'Nos';
    if (!normalized.category) normalized.category = activeTab || 'Part';

    return normalized;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      let parsedData = [];
      try {
        const dataBytes = new Uint8Array(evt.target.result);
        const wb = XLSX.read(dataBytes, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws);
        
        parsedData = rawRows.map(row => normalizeHeaders(row)).filter(row => row.part_number && row.name);
        
        if (parsedData.length === 0) {
          alert('No valid items found. Please ensure the Excel sheet has at least a "Part Number" (or "P/N") and "Description" (or "Name") for each row.');
          return;
        }
      } catch (parseErr) {
        console.error('Excel parse error:', parseErr);
        alert('Failed to read or parse the Excel file. Please ensure it is a valid spreadsheet (.xlsx, .xls, or .csv).');
        return;
      }

      if (window.confirm(`Found ${parsedData.length} valid items matching inventory columns. Proceed with bulk update/import?`)) {
        try {
          await client.post('/products/bulk', parsedData);
          alert('Inventory updated successfully!');
          fetchProducts();
        } catch (apiErr) {
          console.error('API bulk upload error:', apiErr);
          const errorMsg = apiErr.response?.data?.error || 
                           (apiErr.response ? `Server Error (${apiErr.response.status}): ${apiErr.response.statusText || 'Internal Server Error'}` : `Network Error: Could not connect to the backend server.`);
          alert(`Failed to import inventory:\n\n${errorMsg}`);
        }
      }
    };
    reader.readAsArrayBuffer(file);
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
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx, .xls, .csv"
            onChange={handleImport}
          />
          <button className="btn btn-outline" onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Upload size={16} />
            <span>Import</span>
          </button>
          <button className="btn btn-outline" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} />
            <span>Export</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Add {activeTab}</span>
          </button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Unit</label>
                  <select className="input" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                    <option value="Nos">Nos</option>
                    <option value="Sets">Sets</option>
                    <option value="Mtrs">Mtrs</option>
                    <option value="Kgs">Kgs</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Tax Rate (%)</label>
                  <select className="input" value={formData.tax_rate} onChange={(e) => setFormData({...formData, tax_rate: parseInt(e.target.value)})}>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Purchase Price</label>
                  <input type="number" step="any" className="input" required value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || ''})} />
                </div>
                <div className="input-group">
                  <label className="label">Sales Price</label>
                  <input type="number" step="any" className="input" required value={formData.sales_price} onChange={(e) => setFormData({...formData, sales_price: parseFloat(e.target.value) || ''})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
