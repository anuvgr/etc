import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FYProvider } from './context/FYContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Quotes from './pages/Quotes';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import PrintView from './pages/PrintView';
import Payments from './pages/Payments';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
import Logs from './pages/Logs';
import PurchaseReturns from './pages/PurchaseReturns';
import SalesReturns from './pages/SalesReturns';
import DayBook from './pages/DayBook';
import ProfitLoss from './pages/ProfitLoss';
import Ledgers from './pages/Ledgers';

import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children, useLayout = true }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading session...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (!useLayout) return <div className="animate-in">{children}</div>;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FYProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/purchase-returns" element={<ProtectedRoute><PurchaseReturns /></ProtectedRoute>} />
            <Route path="/sales-returns" element={<ProtectedRoute><SalesReturns /></ProtectedRoute>} />
            <Route path="/day-book" element={<ProtectedRoute><DayBook /></ProtectedRoute>} />
            <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
            <Route path="/ledgers" element={<ProtectedRoute><Ledgers /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            
            {/* Reports split logic could be handled inside Reports.jsx or separate pages */}
            <Route path="/reports/gst" element={<ProtectedRoute><Reports defaultTab="gst" /></ProtectedRoute>} />
            <Route path="/reports/sales" element={<ProtectedRoute><Reports defaultTab="products" /></ProtectedRoute>} />
            <Route path="/reports/purchases" element={<ProtectedRoute><Reports defaultTab="purchases" /></ProtectedRoute>} />
            
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/backup" element={<ProtectedRoute><Backup /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            
            <Route path="/print/:type/:id" element={<ProtectedRoute useLayout={false}><PrintView /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        </FYProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
