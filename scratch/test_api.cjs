const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = login.data.token;
    
    const res = await axios.post('http://localhost:5000/api/customers', {
      name: 'Script Test',
      company_name: 'Test Co'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Failed:', err.response ? err.response.data : err.message);
  }
}

test();
