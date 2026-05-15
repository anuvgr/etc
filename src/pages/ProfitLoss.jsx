import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { BarChart2, Calendar, TrendingUp, TrendingDown, DollarSign, Printer, ArrowRight } from 'lucide-react';

const ProfitLoss = () => {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPL();
  }, [fromDate, toDate]);

  const fetchPL = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/reports/profit-loss', { 
        params: { from: fromDate, to: toDate } 
      });
      setData(data);
    } catch (err) {
      console.error('Failed to fetch P&L data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!data && loading) return <div style={{ padding: '2rem', color: 'white' }}>Calculating Profit & Loss...</div>;

  return (
    <div className="animate-in">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .main-content { margin: 0; padding: 0; }
          .card { box-shadow: none; border: 1px solid #eee; background: white !important; color: black !important; }
          .text-muted { color: #666 !important; }
          body { background: white !important; color: black !important; }
          .profit-value { color: #000 !important; font-weight: bold; }
        }
        .pl-row {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border);
        }
        .pl-row:last-child {
          border-bottom: none;
        }
        .pl-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-muted);
        }
        .pl-value {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .pl-total {
          background: rgba(255,255,255,0.03);
          padding: 1.5rem;
          border-radius: 8px;
          margin-top: 1rem;
          border-top: 2px solid var(--primary);
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Profit & Loss Statement</h1>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Financial performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <input 
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '115px', fontSize: '0.85rem' }}
              value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input 
              type="date" className="input" style={{ border: 'none', background: 'transparent', padding: 0, width: '115px', fontSize: '0.85rem' }}
              value={toDate} onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" onClick={handlePrint} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Print Statement
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', maxWidth: '1000px', margin: '0 auto 1.5rem auto' }}>
        <div className="stat-card glass" style={{ borderLeft: '3px solid var(--primary)', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Total Revenue</span>
          <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '700' }}>{"\u20B9"}{data?.revenue?.toLocaleString()}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '3px solid #ef4444', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Total COGS</span>
          <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>{"\u20B9"}{data?.cogs?.toLocaleString()}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '3px solid #10b981', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Gross Profit</span>
          <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '700' }}>{"\u20B9"}{data?.grossProfit?.toLocaleString()}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '3px solid #f59e0b', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Expenses</span>
          <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: '700' }}>{"\u20B9"}{data?.expenses?.toLocaleString()}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: `3px solid ${data?.netProfit >= 0 ? '#3b82f6' : '#ef4444'}`, padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Net Position</span>
          <span style={{ color: data?.netProfit >= 0 ? '#3b82f6' : '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>{"\u20B9"}{Math.abs(data?.netProfit || 0).toLocaleString()}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '3px solid #8b5cf6', padding: '0.4rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.65rem' }}>Profit %</span>
          <span style={{ color: '#8b5cf6', fontSize: '0.9rem', fontWeight: '700' }}>{data?.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="card glass" style={{ padding: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '1rem' }}>Operating Statement</h2>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{fromDate} to {toDate}</span>
          </div>

          <div style={{ padding: '0 0.5rem' }}>
            <div className="pl-row" style={{ padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Revenue</span>
              <span className="pl-value" style={{ fontSize: '0.9rem' }}>{"\u20B9"}{data?.revenue?.toLocaleString()}</span>
            </div>
            
            <div className="pl-row" style={{ padding: '0.5rem 0' }}>
              <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Cost of Sales (COGS)</span>
              <span className="pl-value" style={{ color: '#ef4444', fontSize: '0.9rem' }}>- {"\u20B9"}{data?.cogs?.toLocaleString()}</span>
            </div>

            <div className="pl-row pl-total" style={{ padding: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Gross Profit</span>
              <span style={{ color: '#10b981', fontWeight: '700', fontSize: '1rem' }}>{"\u20B9"}{data?.grossProfit?.toLocaleString()}</span>
            </div>

            <div className="pl-row" style={{ padding: '0.5rem 0' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Operating Expenses</span>
              <span className="pl-value" style={{ color: '#ef4444', fontSize: '0.9rem' }}>- ₹{data?.expenses?.toLocaleString()}</span>
            </div>

            <div className="pl-row pl-total" style={{ padding: '1rem', marginTop: '1rem', background: data?.netProfit >= 0 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bottom Line</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: data?.netProfit >= 0 ? '#3b82f6' : '#ef4444' }}>
                  {data?.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: data?.netProfit >= 0 ? '#3b82f6' : '#ef4444' }}>
                  {"\u20B9"}{Math.abs(data?.netProfit || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;
