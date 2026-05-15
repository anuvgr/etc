import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const FYContext = createContext();

export const FYProvider = ({ children }) => {
  const { user } = useAuth();
  const [fyears, setFyears] = useState([]);
  const [activeFY, setActiveFY] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFY = async () => {
    try {
      const { data } = await client.get('/financial-years');
      setFyears(data);
      const active = data.find(fy => fy.is_active);
      setActiveFY(active);
    } catch (err) {
      console.error('Failed to fetch FY:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFY();
    } else {
      setLoading(false);
    }
  }, [user]);

  const switchFY = async (id) => {
    try {
      await client.put(`/financial-years/${id}/activate`);
      await fetchFY();
      window.location.reload();
    } catch (err) {
      alert('Failed to switch Financial Year');
    }
  };

  const isLatestFY = activeFY && fyears.length > 0 
    ? new Date(activeFY.end_date).getTime() === Math.max(...fyears.map(f => new Date(f.end_date).getTime()))
    : false;

  return (
    <FYContext.Provider value={{ fyears, activeFY, isLatestFY, switchFY, loading, refreshFY: fetchFY }}>
      {children}
    </FYContext.Provider>
  );
};

export const useFY = () => useContext(FYContext);
