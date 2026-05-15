import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Package,
  Truck,
  Receipt,
  BarChart3,
  PieChart,
  UserCog,
  Settings,
  Database,
  LogOut,
  HardHat,
  History,
  Menu,
  X as CloseIcon,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCcw,
  ArrowLeftRight,
  Sun,
  Moon,
  BookOpen,
  BarChart2,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFY } from '../context/FYContext';
import client from '../api/client';

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { fyears, activeFY, switchFY } = useFY();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Billing', path: '/invoices', icon: FileText },
    { name: 'Quotations', path: '/quotes', icon: ClipboardList },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  const inventoryItems = [
    { name: 'Inventory', path: '/products', icon: Package },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Sales Returns', path: '/sales-returns', icon: RefreshCcw },
    { name: 'Purchase Returns', path: '/purchase-returns', icon: ArrowLeftRight },
  ];

  const financeItems = [
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Ledgers', path: '/ledgers', icon: Wallet },
    { name: 'Day Book', path: '/day-book', icon: BookOpen },
    { name: 'P & L', path: '/profit-loss', icon: BarChart2 },
  ];

  const reportItems = [
    { name: 'GST Summary', path: '/reports/gst', icon: BarChart3 },
    { name: 'Sales Reports', path: '/reports/sales', icon: PieChart },
    { name: 'Purchase Reports', path: '/reports/purchases', icon: BarChart3 },
  ];

  const adminItems = [
    { name: 'User Management', path: '/users', icon: UserCog },
    { name: 'System Settings', path: '/settings', icon: Settings },
    { name: 'Data Backup', path: '/backup', icon: Database },
    { name: 'Activity Logs', path: '/logs', icon: History },
  ];

  return (
    <div className="app-container">
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '6px', padding: '2px' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>Ephphatha</h1>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Construction Trading</p>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileOpen(false)}>
            <CloseIcon size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          <div className="nav-section">Transactions</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ padding: '0.6rem 0.75rem', fontSize: '0.875rem', margin: '0.2rem 0.5rem' }}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <div className="nav-section">Inventory & Stock</div>
          {inventoryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ padding: '0.6rem 0.75rem', fontSize: '0.875rem', margin: '0.2rem 0.5rem' }}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <div className="nav-section">Finance & Returns</div>
          {financeItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ padding: '0.6rem 0.75rem', fontSize: '0.875rem', margin: '0.2rem 0.5rem' }}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <div className="nav-section">Reports & Analytics</div>
          {reportItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ padding: '0.6rem 0.75rem', fontSize: '0.875rem', margin: '0.2rem 0.5rem' }}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}

          {user?.role?.toLowerCase() === 'admin' && (
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className="nav-link"
                style={{ width: 'calc(100% - 1rem)', border: 'none', background: 'none', cursor: 'pointer', padding: '0.6rem 0.75rem', fontSize: '0.875rem', margin: '0 0.5rem', display: 'flex', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={18} />
                  <span>Admin Control</span>
                </div>
                {isAdminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isAdminOpen && (
                <div style={{ marginLeft: '1.5rem', marginTop: '0.25rem', borderLeft: '1px solid var(--border)' }}>
                  {adminItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', margin: '0.1rem 0.5rem' }}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <item.icon size={16} />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <button
            onClick={toggleTheme}
            className="nav-link"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem', marginBottom: '0.5rem' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button onClick={handleLogout} className="nav-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1 className="header-title">Construction Management</h1>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Welcome, {user?.username}</p>
            </div>
          </div>

          {/* FY Selector Tabs - Only for Admins */}
          {user?.role?.toLowerCase() === 'admin' && (
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {fyears.map(fy => (
                <button
                  key={fy.id}
                  onClick={() => fy.id !== activeFY?.id && switchFY(fy.id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: fy.id === activeFY?.id ? 'var(--primary)' : 'transparent',
                    color: fy.id === activeFY?.id ? '#fff' : 'var(--text-color)'
                  }}
                >
                  FY {fy.label}
                </button>
              ))}
            </div>
          )}
        </header>
        <div className="animate-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
