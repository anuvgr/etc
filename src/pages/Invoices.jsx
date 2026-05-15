import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { FileText, Plus, Search, ExternalLink, Package, MessageCircle, Calendar, X } from 'lucide-react';
import { formatDate } from '../utils/format';
import InvoiceForm from '../components/InvoiceForm';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';

const STATUS_OPTIONS = ['All', 'Pending', 'Cash', 'Credit', 'Paid'];

const STATUS_COLORS = {
  Paid:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  Cash:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  Credit:  { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  Pending: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
};

const Invoices = () => {
  const { user } = useAuth();
  const { isLatestFY } = useFY();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchInvoices();
  }, [fromDate, toDate, showAll, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (showAll) {
        params.all = 'true';
      } else if (fromDate && toDate) {
        params.from = fromDate;
        params.to = toDate;
      }
      if (statusFilter !== 'All') params.status = statusFilter;
      const { data } = await client.get('/invoices', { params });
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setShowAll(false);
    setStatusFilter('All');
    setSearch('');
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const hasActiveFilters = fromDate || toDate || showAll || statusFilter !== 'All' || search;

  return (
    <div>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2.2rem', height: '38px' }}
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === s ? 'var(--primary)' : 'transparent',
                  color: statusFilter === s ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >{s}</button>
            ))}
          </div>

          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: showAll ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: `1px solid ${showAll ? 'var(--primary)' : 'var(--border)'}` }}>
            <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date" className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, width: '115px', fontSize: '0.8rem', opacity: showAll ? 0.4 : 1 }}
              value={fromDate} onChange={(e) => { setFromDate(e.target.value); setShowAll(false); }}
              disabled={showAll}
            />
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>to</span>
            <input
              type="date" className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, width: '115px', fontSize: '0.8rem', opacity: showAll ? 0.4 : 1 }}
              value={toDate} onChange={(e) => { setToDate(e.target.value); setShowAll(false); }}
              disabled={showAll}
            />
          </div>

          {/* Show All toggle */}
          <button
            onClick={() => { setShowAll(v => !v); setFromDate(''); setToDate(''); }}
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: `1px solid ${showAll ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
              background: showAll ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: showAll ? 'var(--primary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}
          >
            {showAll ? '✓ All Time' : 'Show All'}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              title="Clear all filters"
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', fontWeight: '600'
              }}
            >
              <X size={14} /> Clear
            </button>
          )}

          {/* Create Invoice */}
          {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ whiteSpace: 'nowrap' }}>
              <Plus size={18} /> Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {loading ? 'Loading...' : (
          <>
            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredInvoices.length}</strong> invoice{filteredInvoices.length !== 1 ? 's' : ''}
            {showAll ? ' (all time)' : fromDate && toDate ? ` (${fromDate} to ${toDate})` : ' (current FY)'}
            {statusFilter !== 'All' ? ` · Status: ${statusFilter}` : ''}
            {search ? ` · Search: "${search}"` : ''}
          </>
        )}
      </div>

      {/* Table */}
      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th style={{ width: '45px' }}>#</th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice, index) => {
              const sc = STATUS_COLORS[invoice.status] || { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
              return (
                <tr key={invoice.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{index + 1}</td>
                  <td style={{ fontWeight: '600' }}>{invoice.invoice_number}</td>
                  <td>{invoice.customer_name}</td>
                  <td>{formatDate(invoice.date)}</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{invoice.total.toLocaleString()}</td>
                  <td>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', background: sc.bg, color: sc.color, fontWeight: '600' }}>
                      {invoice.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => {
                        const phone = invoice.customer_phone?.replace(/[^0-9]/g, '');
                        if (!phone) return alert('No phone number found');
                        const msg = `Dear ${invoice.customer_name}, Your invoice ${invoice.invoice_number} for ₹${invoice.total.toLocaleString()} from Ephphatha Construction is ready.`;
                        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="btn btn-outline" style={{ padding: '0.35rem', color: '#25D366' }} title="Send via WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </button>
                    <button onClick={() => window.open(`/print/invoice/${invoice.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.35rem' }} title="Print GST Invoice">
                      <ExternalLink size={15} />
                    </button>
                    <button onClick={() => window.open(`/print/thermal/${invoice.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.35rem' }} title="Print Thermal Receipt">
                      <FileText size={15} />
                    </button>
                    <button onClick={() => window.open(`/print/challan/${invoice.id}`, '_blank')} className="btn btn-outline" style={{ padding: '0.35rem' }} title="Print Delivery Challan">
                      <Package size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
            <FileText size={40} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No invoices found.</p>
            {!showAll && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Try clicking <strong>Show All</strong> to see invoices from all financial years.</p>}
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          type="invoice"
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchInvoices(); }}
        />
      )}
    </div>
  );
};

export default Invoices;
