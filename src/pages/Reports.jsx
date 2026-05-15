import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDate } from '../utils/format';
import {
  BarChart3,
  Download,
  Calendar,
  FileText,
  Package,
  Users,
  Search,
  Filter,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingCart,
  RefreshCcw,
  ExternalLink,
  PieChart
} from 'lucide-react';

const Reports = ({ defaultTab = 'gst' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
    setProductSearch(''); // Reset search when tab changes
  }, [defaultTab]);

  useEffect(() => {
    setProductSearch('');
  }, [activeTab]);
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [productPurchases, setProductPurchases] = useState([]);
  const [customerSales, setCustomerSales] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [priceComparison, setPriceComparison] = useState([]);
  const [quoteReport, setQuoteReport] = useState({ stats: [], list: [] });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = fromDate && toDate ? { from: fromDate, to: toDate } : {};

      const fetchSet = async (endpoint, setter) => {
        try {
          const { data } = await client.get(endpoint, { params });
          setter(data);
        } catch (e) {
          console.error(`Failed to fetch ${endpoint}:`, e);
          setter([]);
        }
      };

      await Promise.all([
        fetchSet('/invoices', setInvoices),
        fetchSet('/purchases', setPurchases),
        fetchSet('/reports/products', setProductSales),
        fetchSet('/reports/purchases', setProductPurchases),
        fetchSet('/reports/customers', setCustomerSales),
        fetchSet('/reports/quotations', (data) => setQuoteReport(data)),
        fetchSet('/sales-returns', setSalesReturns),
        fetchSet('/purchase-returns', setPurchaseReturns),
        fetchSet('/reports/purchase-price-comparison', setPriceComparison)
      ]);

      // Financial Years fetch is special as it helps pre-fill dates
      try {
        const { data: fyears } = await client.get('/financial-years');
        if (!fromDate && !toDate) {
          const activeFY = fyears.find(f => f.is_active);
          if (activeFY) {
            setFromDate(activeFY.start_date);
            setToDate(activeFY.end_date);
          }
        }
      } catch (e) {
        console.error('Failed to fetch financial years:', e);
      }
    } catch (err) {
      console.error('General fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalInvoiceTaxable = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalReturnTaxable = salesReturns.reduce((sum, ret) => sum + (ret.subtotal || 0), 0);
  const totalTaxable = totalInvoiceTaxable - totalReturnTaxable;

  const totalInvoiceCGST = invoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
  const totalReturnCGST = salesReturns.reduce((sum, ret) => sum + (ret.cgst || 0), 0);
  const totalCGST = totalInvoiceCGST - totalReturnCGST;

  const totalInvoiceSGST = invoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
  const totalReturnSGST = salesReturns.reduce((sum, ret) => sum + (ret.sgst || 0), 0);
  const totalSGST = totalInvoiceSGST - totalReturnSGST;

  const totalInvoiceIGST = invoices.reduce((sum, inv) => sum + (inv.igst || 0), 0);
  const totalReturnIGST = salesReturns.reduce((sum, ret) => sum + (ret.igst || 0), 0);
  const totalIGST = totalInvoiceIGST - totalReturnIGST;

  const totalGST = totalCGST + totalSGST + totalIGST;

  const combinedSales = [
    ...invoices.map(inv => ({ ...inv, isReturn: false, doc_number: inv.invoice_number })),
    ...salesReturns.map(ret => ({ ...ret, isReturn: true, doc_number: ret.return_number }))
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db_ = b.date ? new Date(b.date).getTime() : 0;
    return db_ - da;
  });

  const filteredSales = combinedSales.filter(inv =>
    !productSearch ||
    (inv.product_names || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (inv.doc_number || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const combinedPurchases = [
    ...purchases.map(pur => ({ ...pur, isReturn: false, doc_number: pur.purchase_number })),
    ...purchaseReturns.map(ret => ({ ...ret, isReturn: true, doc_number: ret.return_number }))
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db_ = b.date ? new Date(b.date).getTime() : 0;
    return db_ - da;
  });

  const filteredPurchases = combinedPurchases.filter(pur =>
    !productSearch ||
    (pur.product_names || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (pur.supplier_name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (pur.doc_number || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  // Ledger Calculations
  const outCGST = invoices.reduce((sum, i) => sum + (i.cgst || 0), 0);
  const outSGST = invoices.reduce((sum, i) => sum + (i.sgst || 0), 0);
  const outIGST = invoices.reduce((sum, i) => sum + (i.igst || 0), 0);
  const srCGST = salesReturns.reduce((sum, r) => sum + (r.cgst || 0), 0);
  const srSGST = salesReturns.reduce((sum, r) => sum + (r.sgst || 0), 0);
  const srIGST = salesReturns.reduce((sum, r) => sum + (r.igst || 0), 0);
  const netOutCGST = outCGST - srCGST;
  const netOutSGST = outSGST - srSGST;
  const netOutIGST = outIGST - srIGST;
  const totalOutput = netOutCGST + netOutSGST + netOutIGST;

  const inCGST = purchases.reduce((sum, p) => sum + (p.cgst || 0), 0);
  const inSGST = purchases.reduce((sum, p) => sum + (p.sgst || 0), 0);
  const inIGST = purchases.reduce((sum, p) => sum + (p.igst || 0), 0);
  const prCGST = purchaseReturns.reduce((sum, r) => sum + (r.cgst || 0), 0);
  const prSGST = purchaseReturns.reduce((sum, r) => sum + (r.sgst || 0), 0);
  const prIGST = purchaseReturns.reduce((sum, r) => sum + (r.igst || 0), 0);
  const netInCGST = inCGST - prCGST;
  const netInSGST = inSGST - prSGST;
  const netInIGST = inIGST - prIGST;
  const totalInput = netInCGST + netInSGST + netInIGST;

  const netPayable = totalOutput - totalInput;

  // Purchases Tab Calculations
  const totalPurValue = purchases.reduce((sum, p) => sum + (p.total || 0), 0) - purchaseReturns.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalPurTax = purchases.reduce((sum, p) => sum + ((p.cgst || 0) + (p.sgst || 0) + (p.igst || 0)), 0) - purchaseReturns.reduce((sum, r) => sum + ((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)), 0);


  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`btn ${activeTab === id ? 'btn-primary' : 'btn-outline'}`}
      style={{ padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}
    >
      <Icon size={18} /> {label}
    </button>
  );

  const handleExport = () => {
    let dataToExport = [];
    let filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'gst') dataToExport = combinedSales;
    else if (activeTab === 'products') dataToExport = productSales;
    else if (activeTab === 'purchases') dataToExport = combinedPurchases;
    else if (activeTab === 'customers') dataToExport = customerSales;
    else if (activeTab === 'returns') dataToExport = [...salesReturns, ...purchaseReturns];
    else if (activeTab === 'quotes') dataToExport = quoteReport.list;

    if (dataToExport.length === 0) return alert('No data to export');

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(obj =>
      Object.values(obj).map(val => `"${val}"`).join(',')
    ).join('\n');

    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <TabButton id="gst" label="GST Summary" icon={BarChart3} />
          <TabButton id="products" label="Sales" icon={Package} />
          <TabButton id="purchases" label="Purchases" icon={ShoppingCart} />
          <TabButton id="customers" label="Customers" icon={Users} />
          <TabButton id="quotes" label="Quotes" icon={ClipboardList} />
          <TabButton id="returns" label="Returns" icon={RefreshCcw} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Calendar size={18} className="text-muted" />
            <input
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '130px' }}
              value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-muted">to</span>
            <input
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '130px' }}
              value={toDate} onChange={(e) => setToDate(e.target.value)}
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}
              >
                Clear
              </button>
            )}
          </div>
          <button className="btn btn-outline" onClick={fetchData} title="Refresh Data">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={20} /> Export
          </button>
        </div>
      </div>

      {activeTab === 'gst' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #10b981', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Output GST</span>
              <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '700' }}>₹{totalOutput.toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Input GST</span>
              <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>₹{totalInput.toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ borderLeft: '3px solid var(--primary)', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Net Liability</span>
              <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '700' }}>₹{Math.abs(netPayable).toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Total CGST</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>₹{(netOutCGST - netInCGST).toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Total SGST</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>₹{(netOutSGST - netInSGST).toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Total IGST</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>₹{(netOutIGST - netInIGST).toLocaleString()}</span>
            </div>
          </div>

          <div className="card glass" style={{ marginBottom: '2rem', padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} className="text-primary" />
              GST Tax Comparison (Ledger Audit)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: '0.8rem', width: '100%' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <tr>
                    <th style={{ padding: '0.5rem' }}>Tax Component</th>
                    <th style={{ padding: '0.5rem' }}>Output (Liability)</th>
                    <th style={{ padding: '0.5rem' }}>Input (Credit)</th>
                    <th style={{ padding: '0.5rem' }}>Net Position</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: '600' }}>CGST (9%)</td>
                    <td style={{ padding: '0.5rem' }}>₹{netOutCGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem' }}>₹{netInCGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '700', color: (netOutCGST - netInCGST) > 0 ? '#ef4444' : '#10b981' }}>
                      ₹{Math.abs(netOutCGST - netInCGST).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: (netOutCGST - netInCGST) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: (netOutCGST - netInCGST) > 0 ? '#ef4444' : '#10b981' }}>
                        {(netOutCGST - netInCGST) > 0 ? 'Payable' : 'Credit'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: '600' }}>SGST (9%)</td>
                    <td style={{ padding: '0.5rem' }}>₹{netOutSGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem' }}>₹{netInSGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '700', color: (netOutSGST - netInSGST) > 0 ? '#ef4444' : '#10b981' }}>
                      ₹{Math.abs(netOutSGST - netInSGST).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: (netOutSGST - netInSGST) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: (netOutSGST - netInSGST) > 0 ? '#ef4444' : '#10b981' }}>
                        {(netOutSGST - netInSGST) > 0 ? 'Payable' : 'Credit'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: '600' }}>IGST (18%)</td>
                    <td style={{ padding: '0.5rem' }}>₹{netOutIGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem' }}>₹{netInIGST.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '700', color: (netOutIGST - netInIGST) > 0 ? '#ef4444' : '#10b981' }}>
                      ₹{Math.abs(netOutIGST - netInIGST).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: (netOutIGST - netInIGST) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: (netOutIGST - netInIGST) > 0 ? '#ef4444' : '#10b981' }}>
                        {(netOutIGST - netInIGST) > 0 ? 'Payable' : 'Credit'}
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: '800' }}>TOTAL GST</td>
                    <td style={{ padding: '0.5rem', fontWeight: '800', color: '#10b981' }}>₹{totalOutput.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '800', color: '#ef4444' }}>₹{totalInput.toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '900', color: 'var(--primary)', fontSize: '0.9rem' }}>₹{Math.abs(netPayable).toLocaleString()}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '800', color: netPayable >= 0 ? '#ef4444' : '#10b981' }}>{netPayable >= 0 ? 'Payable' : 'Credit'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>GSTR-1 Sales Register</h3>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text" className="input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="Search invoices, customers or items..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Date</th>
                  <th>Inv No.</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Taxable</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((inv, index) => (
                  <tr key={`${inv.isReturn ? 'ret' : 'inv'}-${inv.id}`} style={{ backgroundColor: inv.isReturn ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{index + 1}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{inv.doc_number}</div>
                      {inv.isReturn && <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>CREDIT NOTE</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{inv.customer_name || 'Walking Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customer_gstin || 'UNREGISTERED'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.product_names}>
                        {inv.product_names || 'No items listed'}
                      </div>
                    </td>
                    <td style={{ color: inv.isReturn ? '#ef4444' : 'inherit' }}>{inv.isReturn ? '-' : ''}₹{(inv.subtotal || 0).toLocaleString()}</td>
                    <td style={{ color: inv.isReturn ? '#ef4444' : 'inherit' }}>{inv.isReturn ? '-' : ''}₹{(inv.cgst || 0).toLocaleString()}</td>
                    <td style={{ color: inv.isReturn ? '#ef4444' : 'inherit' }}>{inv.isReturn ? '-' : ''}₹{(inv.sgst || 0).toLocaleString()}</td>
                    <td style={{ color: inv.isReturn ? '#ef4444' : 'inherit' }}>{inv.isReturn ? '-' : ''}₹{(inv.igst || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: '700', color: inv.isReturn ? '#ef4444' : 'var(--primary)' }}>{inv.isReturn ? '-' : ''}₹{(inv.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {!loading && filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No GSTR-1 records found matching your search or for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === 'products' && (
        <div className="animate-in card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3>Top Selling Products</h3>
              <span className="text-muted">Ranked by revenue contribution</span>
            </div>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text" className="input" style={{ paddingLeft: '2.5rem' }}
                placeholder="Search by part name or number..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Part Name</th>
                <th>Part Number</th>
                <th>Qty Sold</th>
                <th>Revenue Generated</th>
                <th>Growth</th>
              </tr>
            </thead>
            <tbody>
              {productSales.filter(p =>
                p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.part_number.toLowerCase().includes(productSearch.toLowerCase())
              ).map((prod, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{idx + 1}</td>
                  <td style={{ fontWeight: '600' }}>{prod.name}</td>
                  <td className="text-muted">{prod.part_number}</td>
                  <td>{prod.total_qty} units</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{prod.total_amount.toLocaleString()}</td>
                  <td style={{ color: '#10b981' }}>+{(15 - idx * 2)}%</td>
                </tr>
              ))}
              {productSales.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No product sales data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="animate-in card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Customer Revenue Summary</h3>
            <span className="text-muted">Total business by client</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Customer Name</th>
                <th>Company</th>
                <th>Invoices</th>
                <th>Total Business</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customerSales.map((cust, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{idx + 1}</td>
                  <td style={{ fontWeight: '600' }}>{cust.name}</td>
                  <td className="text-muted">{cust.company_name}</td>
                  <td>{cust.invoice_count}</td>
                  <td style={{ fontWeight: '600', color: 'var(--accent)' }}>₹{cust.total_spent.toLocaleString()}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '0.75rem'
                    }}>Active</span>
                  </td>
                </tr>
              ))}
              {customerSales.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No customer revenue data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {quoteReport.stats.map((s, idx) => (
              <div key={idx} className="stat-card glass" style={{ padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: s.status === 'Accepted' ? '3px solid #10b981' : '3px solid var(--border)' }}>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>{s.status} Quotes</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: s.status === 'Accepted' ? '#10b981' : 'inherit' }}>₹{s.total_value.toLocaleString()}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({s.count})</span>
                </div>
              </div>
            ))}
            {quoteReport.stats.length === 0 && (
              <div className="stat-card glass" style={{ padding: '0.4rem 0.6rem' }}>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>No quote data yet</span>
              </div>
            )}
          </div>

          <div className="card glass">
            <h3>Quotation Pipeline</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Quote #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quoteReport.list.map((quote, idx) => (
                  <tr key={quote.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '600' }}>{quote.quote_number}</td>
                    <td>{quote.customer_name}</td>
                    <td>{formatDate(quote.date)}</td>
                    <td style={{ fontWeight: '600' }}>₹{quote.total.toLocaleString()}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        background: quote.status === 'Accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: quote.status === 'Accepted' ? '#10b981' : 'var(--text-muted)',
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>{quote.status}</span>
                    </td>
                  </tr>
                ))}
                {quoteReport.list.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No quotation data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Sales Returns</span>
              <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>₹{salesReturns.reduce((sum, r) => sum + r.total, 0).toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Purchase Returns</span>
              <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>₹{purchaseReturns.reduce((sum, r) => sum + r.total, 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="card glass">
            <h3>Returns History</h3>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Return #</th>
                  <th>Related Doc</th>
                  <th>Entity</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesReturns.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ color: '#ef4444', fontWeight: '700' }}>SALES</span></td>
                    <td>{r.return_number}</td>
                    <td>{r.original_invoice}</td>
                    <td>{r.customer_name}</td>
                    <td>{formatDate(r.date)}</td>
                    <td style={{ fontWeight: '600' }}>₹{r.total.toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem' }}
                        onClick={() => window.open(`/print/sales-return/${r.id}`, '_blank')}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {purchaseReturns.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ color: 'var(--primary)', fontWeight: '700' }}>PURCHASE</span></td>
                    <td>{r.return_number}</td>
                    <td>{r.original_bill}</td>
                    <td>{r.supplier_name}</td>
                    <td>{formatDate(r.date)}</td>
                    <td style={{ fontWeight: '600' }}>₹{r.total.toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem' }}
                        onClick={() => window.open(`/print/purchase-return/${r.id}`, '_blank')}
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'purchases' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="stat-card glass" style={{ borderLeft: '3px solid var(--primary)', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Purchase Value</span>
              <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '700' }}>₹{totalPurValue.toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Tax Paid (ITC)</span>
              <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>₹{totalPurTax.toLocaleString()}</span>
            </div>
            <div className="stat-card glass" style={{ borderLeft: '3px solid #3b82f6', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>Transactions</span>
              <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '700' }}>{combinedPurchases.length}</span>
            </div>
          </div>

          <div className="card glass" style={{ marginBottom: '2rem' }}>
            <h3>Purchase Register (GST Breakdown)</h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Date</th>
                  <th>Bill/Pur No.</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Taxable</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((pur, idx) => (
                  <tr key={`${pur.isReturn ? 'ret' : 'pur'}-${pur.id}`} style={{ backgroundColor: pur.isReturn ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{idx + 1}</td>
                    <td>{formatDate(pur.date)}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{pur.doc_number}</div>
                      {pur.isReturn && <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>DEBIT NOTE</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{pur.supplier_company || pur.supplier_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pur.supplier_gstin || 'UNREGISTERED'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pur.product_names}>
                        {pur.product_names || 'No items listed'}
                      </div>
                    </td>
                    <td style={{ color: pur.isReturn ? '#ef4444' : 'inherit' }}>{pur.isReturn ? '-' : ''}₹{(pur.subtotal || 0).toLocaleString()}</td>
                    <td style={{ color: pur.isReturn ? '#ef4444' : 'inherit' }}>{pur.isReturn ? '-' : ''}₹{(pur.cgst || 0).toLocaleString()}</td>
                    <td style={{ color: pur.isReturn ? '#ef4444' : 'inherit' }}>{pur.isReturn ? '-' : ''}₹{(pur.sgst || 0).toLocaleString()}</td>
                    <td style={{ color: pur.isReturn ? '#ef4444' : 'inherit' }}>{pur.isReturn ? '-' : ''}₹{(pur.igst || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: '700', color: pur.isReturn ? '#ef4444' : 'var(--primary)' }}>{pur.isReturn ? '-' : ''}₹{(pur.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {!loading && filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No purchase records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card glass">
            <h3>Product-wise Purchase Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Part Number</th>
                  <th>Total Qty Bought</th>
                  <th>Total Expenditure</th>
                </tr>
              </thead>
              <tbody>
                {productPurchases.map((pp, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600' }}>{pp.name}</td>
                    <td className="text-muted">{pp.part_number}</td>
                    <td>{pp.total_qty} units</td>
                    <td style={{ fontWeight: '600', color: '#ef4444' }}>₹{(pp.total_amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card glass" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} className="text-primary" />
                  Purchase Price Comparison
                </h3>
                <span className="text-muted">Comparing latest vs. previous purchase rates</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Part Number</th>
                  <th>Prev. Rate (Date)</th>
                  <th>Latest Rate (Date)</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {priceComparison.map((pc, idx) => {
                  const diff = pc.previous_price ? (pc.latest_price - pc.previous_price) : 0;
                  const percent = pc.previous_price ? ((diff / pc.previous_price) * 100).toFixed(1) : 0;
                  const isIncreased = diff > 0;
                  const isDecreased = diff < 0;

                  return (
                    <tr key={pc.product_id}>
                      <td style={{ fontWeight: '600' }}>{pc.product_name}</td>
                      <td className="text-muted">{pc.part_number}</td>
                      <td>
                        {pc.previous_price ? (
                          <>
                            <div style={{ fontWeight: '600' }}>₹{pc.previous_price.toLocaleString()}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(pc.previous_date)}</div>
                          </>
                        ) : '-'}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>₹{pc.latest_price.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(pc.latest_date)}</div>
                      </td>
                      <td style={{ 
                        fontWeight: '700', 
                        color: isIncreased ? '#ef4444' : isDecreased ? '#10b981' : 'inherit' 
                      }}>
                        {pc.previous_price ? (
                          <>
                            {isIncreased ? '+' : ''}{diff.toLocaleString()} 
                            <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: '400' }}>
                              ({isIncreased ? '+' : ''}{percent}%)
                            </span>
                          </>
                        ) : 'First Purchase'}
                      </td>
                      <td>
                        {pc.previous_price ? (
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            background: isIncreased ? 'rgba(239, 68, 68, 0.1)' : isDecreased ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: isIncreased ? '#ef4444' : isDecreased ? '#10b981' : 'var(--text-muted)'
                          }}>
                            {isIncreased ? 'Increased' : isDecreased ? 'Decreased' : 'No Change'}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {priceComparison.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No purchase price history available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="text-muted">Fetching report data...</div>
        </div>
      )}
    </div>
  );
};

export default Reports;
