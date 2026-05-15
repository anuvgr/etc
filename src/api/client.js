import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
});

let cachedIp = null;
let fetchingIp = null;

const getIp = async () => {
  if (cachedIp) return cachedIp;
  if (!fetchingIp) {
    fetchingIp = axios.get('https://api.ipify.org?format=json')
      .then(res => { cachedIp = res.data.ip; return cachedIp; })
      .catch(() => { cachedIp = '127.0.0.1'; return cachedIp; });
  }
  return fetchingIp;
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Non-blocking IP fetch
  if (cachedIp) {
    config.headers['x-client-ip'] = cachedIp;
  } else if (!fetchingIp) {
    getIp(); // Start fetching for next time
  }
  
  return config;
});

// Response interceptor to handle token expiration/invalid tokens
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
