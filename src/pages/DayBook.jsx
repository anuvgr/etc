import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatDate } from '../utils/format';
import { BookOpen, Calendar, TrendingUp, TrendingDown, Wallet, Printer, FileText, Calculator, BarChart2 } from 'lucide-react';

const DayBook = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({ invoices: [], purchases: [], expenses: [], payments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDayData();
  }, [date]);

  const fetchDayData = async () => {
    setLoading(true);
    try {
      const [invRes, purRes, expRes, payRes] = await Promise.all([
        client.get('/invoices', { params: { from: date, to: date } }),
        client.get('/purchases', { params: { from: date, to: date } }),
        client.get('/expenses', { params: { from: date, to: date } }),
        client.get('/payments', { params: { from: date, to: date } })
      ]);
      setData({
        invoices: invRes.data,
        purchases: purRes.data,
        expenses: expRes.data,
        payments: payRes.data
      });
    } catch (err) {
      console.error('Failed to fetch day book data', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = data.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPurchases = data.purchases.reduce((sum, pur) => sum + pur.total, 0);
  const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const cashInvoices = data.invoices.filter(inv => inv.status === 'Cash' || inv.status === 'Paid');
  const totalCashInvoices = cashInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPayments = data.payments.reduce((sum, pay) => sum + pay.amount, 0);
  const totalInflow = totalPayments + totalCashInvoices;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-in">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .main-content { margin: 0; padding: 0; }
          .sidebar { display: none; }
          .card { box-shadow: none; border: 1px solid #eee; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={28} className="text-primary" />
            Day Book
          </h1>
          <p className="text-muted">Daily Transaction Summary</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Calendar size={18} className="text-muted" />
            <input 
              type="date" 
              className="input" 
              style={{ border: 'none', background: 'transparent', padding: 0, width: '130px' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={18} /> Print Day Book
          </button>
        </div>
      </div>

      <div className="stat-grid no-print">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Daily Sales</span>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div className="stat-value text-primary">₹{totalSales.toLocaleString()}</div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{data.invoices.length} Invoices generated</p>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Daily Purchases</span>
            <TrendingDown size={20} color="#ef4444" />
          </div>
          <div className="stat-value">₹{totalPurchases.toLocaleString()}</div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{data.purchases.length} Purchase bills recorded</p>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Cash Inflow (Payments)</span>
            <Wallet size={20} color="#3b82f6" />
          </div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>₹{totalInflow.toLocaleString()}</div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Collection from customers</p>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Daily Expenses</span>
            <Calculator size={20} color="#f59e0b" />
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>₹{totalExpenses.toLocaleString()}</div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Other operating costs</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="daybook-content">
        {/* Sales Table */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#10b981" />
              Sales (Invoices)
            </h3>
          </div>
          {data.invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">No sales today</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Inv #</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td>
                    <td style={{ fontSize: '0.875rem' }}>{inv.customer_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{inv.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ fontWeight: '700', paddingTop: '1rem' }}>Total Sales</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', paddingTop: '1rem', color: 'var(--primary)' }}>₹{totalSales.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Purchases Table */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={18} color="#ef4444" />
              Purchases
            </h3>
          </div>
          {data.purchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">No purchases today</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Pur #</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map(pur => (
                  <tr key={pur.id}>
                    <td>{pur.purchase_number}</td>
                    <td style={{ fontSize: '0.875rem' }}>{pur.supplier_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{pur.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ fontWeight: '700', paddingTop: '1rem' }}>Total Purchases</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', paddingTop: '1rem' }}>₹{totalPurchases.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="daybook-content">
         {/* Payments (Inflow) */}
         <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={18} color="#3b82f6" />
              Payments Received (Inflow)
            </h3>
          </div>
          {data.payments.length === 0 && cashInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">No collections today</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mode / Ref</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cashInvoices.map(inv => (
                  <tr key={`inv-${inv.id}`}>
                    <td style={{ fontSize: '0.875rem' }}>{inv.customer_name}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '600' }}>
                        Cash Invoice
                      </span>
                      <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#10b981' }}>₹{inv.total.toLocaleString()}</td>
                  </tr>
                ))}
                {data.payments.map(pay => (
                  <tr key={`pay-${pay.id}`}>
                    <td style={{ fontSize: '0.875rem' }}>{pay.customer_name}</td>
                    <td>{pay.payment_mode}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{pay.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ fontWeight: '700', paddingTop: '1rem' }}>Total Collection</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', paddingTop: '1rem', color: '#3b82f6' }}>₹{totalInflow.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Expenses Table */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={18} color="#f59e0b" />
              Other Expenses
            </h3>
          </div>
          {data.expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">No expenses today</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Details</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.category}</td>
                    <td style={{ fontSize: '0.75rem' }}>{exp.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{exp.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ fontWeight: '700', paddingTop: '1rem' }}>Total Expenses</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', paddingTop: '1rem', color: '#f59e0b' }}>₹{totalExpenses.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayBook;
