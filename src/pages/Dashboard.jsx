import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { 
  TrendingUp, 
  FileText, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await client.get('/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const dummyChartData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 5000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
  ];

  if (loading) return <div className="text-muted">Loading dashboard...</div>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
            <TrendingUp size={20} />
            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center' }}>
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Total Sales</p>
          <h3 className="stat-value">₹{stats?.totalSales?.toLocaleString()}</h3>
        </div>

        <div className="stat-card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
            <ShoppingCart size={20} />
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Total Purchases</p>
          <h3 className="stat-value">₹{stats?.totalPurchases?.toLocaleString()}</h3>
        </div>

        <div className="stat-card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
            <FileText size={20} />
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Active Quotes</p>
          <h3 className="stat-value">{stats?.totalQuotes}</h3>
        </div>

        <div className="stat-card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
            <Package size={20} />
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Total Parts</p>
          <h3 className="stat-value">{stats?.totalProducts}</h3>
        </div>

        <div className="stat-card glass" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Low Stock Items</p>
          <h3 className="stat-value">{stats?.lowStock}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card glass" style={{ minHeight: '280px' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Sales Performance</h3>
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dummyChartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <FileText size={18} /> New Invoice
            </button>
            <button className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <ClipboardList size={18} /> New Quotation
            </button>
            <button className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <ShoppingCart size={18} /> New Purchase
            </button>
            <button className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <Package size={18} /> Add Product
            </button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h4 className="text-muted" style={{ marginBottom: '1rem' }}>Recent Notifications</h4>
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <p>Excavator Hydraulic Pump stock low</p>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>2 hours ago</span>
              </div>
              <div style={{ padding: '0.75rem 0' }}>
                <p>Quote #QT-1024 approved by ABC Construction</p>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>5 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
