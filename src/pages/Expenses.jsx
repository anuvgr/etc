import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Receipt, Plus, Search, Calendar, Tag } from 'lucide-react';
import { formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';

const Expenses = () => {
  const { user } = useAuth();
  const { isLatestFY } = useFY();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_mode: 'Cash'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data } = await client.get('/expenses');
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/expenses', formData);
      setShowModal(false);
      fetchExpenses();
      setFormData({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', payment_mode: 'Cash' });
    } catch (err) {
      alert('Failed to add expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="card glass" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <Receipt className="text-muted" size={20} />
           <div>
             <p className="text-muted" style={{ fontSize: '0.75rem' }}>Total Monthly Expenses</p>
             <h3 style={{ fontSize: '1.25rem' }}>₹{totalExpenses.toLocaleString()}</h3>
           </div>
        </div>
        {(user?.role?.toLowerCase() === 'admin' || isLatestFY) && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} /> Log Expense
          </button>
        )}
      </div>

      <div className="card glass">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Payment Mode</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id}>
                <td>{formatDate(expense.date)}</td>
                <td>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', borderRadius: '12px', fontSize: '0.75rem' 
                  }}>
                    {expense.category}
                  </span>
                </td>
                <td className="text-muted">{expense.description}</td>
                <td>{expense.payment_mode}</td>
                <td style={{ fontWeight: '700', color: '#ef4444' }}>₹{expense.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Log New Expense</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Category</label>
                <select 
                  className="input" required 
                  value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option value="Rent">Rent</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Transport">Transport</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="label">Amount (₹)</label>
                  <input 
                    type="number" className="input" required 
                    value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="label">Date</label>
                  <input 
                    type="date" className="input" required 
                    value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Payment Mode</label>
                <select 
                  className="input" required 
                  value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Description</label>
                <textarea 
                  className="input" style={{ resize: 'none', height: '80px' }}
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Expense</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
