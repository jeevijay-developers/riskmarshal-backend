const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in Node 18+

const BASE_URL = 'http://localhost:5000/api';

const SAMPLE_USER = {
  username: 'test_renewal_user',
  email: 'test_renewal@riskmarshal.com',
  password: 'password123',
  role: 'agent',
  firstName: 'Test',
  lastName: 'Agent',
  phone: '9876543210'
};

const createPolicy = async (token, daysUntilExpiry, policyNumber) => {
  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + daysUntilExpiry);
  
  const startDate = new Date();
  startDate.setFullYear(expiryDate.getFullYear() - 1);
  startDate.setMonth(expiryDate.getMonth());
  startDate.setDate(expiryDate.getDate());

  const policyData = {
    client: {
      name: `Client ${policyNumber}`,
      email: `client${policyNumber}@example.com`,
      contactNumber: `98765${String(policyNumber).padStart(5, '0')}`,
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    insurerId: null, // Would need actual ID, but backend might handle creation or we skip
    policyTypeId: null, // Same
    // Since we don't have IDs for insurer/policyType readily available without fetching them first, 
    // we'll let the backend create defaults or we need to fetch them.
    // Actually, looking at policyService.js, createPolicy expects:
    // client: object (creates new client)
    // insurerId: string
    // policyTypeId: string
    // ...
    // This is tricky without existing IDs.
    
    // Let's rely on the fact that existing seed data usually exists or we should create them first.
    // Or we can cheat and send arbitrary IDs if the backend doesn't validate strictly (it essentially does `findById`).
    
    // Better approach: Fetch existing insurers and policy types first.
  };
  
  // Wait, I can't easily use the API if I don't have valid IDs for relations.
  // Using Mongoose directly is safer because I can creating dependent objects on the fly easily.
};

// Re-evaluating: "Using the APIs" is strictly requested.
// I will write a robust script that:
// 1. Logs in/Registers
// 2. Fetches Insurers (if none, creates one if API exists, else fails)
// 3. Fetches PolicyTypes
// 4. Creates Policies

async function main() {
  // 1. Login/Register
  let token;
  console.log('Authenticating...');
  
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SAMPLE_USER.email, password: SAMPLE_USER.password })
  });
  
  let data = await res.json();
  
  if (!data.success) {
    console.log('Login failed, trying register...');
    res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_USER)
    });
    data = await res.json();
  }
  
  if (!data.success || !data.data?.token) {
    console.error('Authentication failed:', data);
    process.exit(1);
  }
  
  token = data.data.token;
  const authHeaders = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };
  
  console.log('Authenticated. Token:', token.substring(0, 20) + '...');

  // 2. Get Dependencies (Insurers, PolicyTypes, Subagents)
  // We need to assume these endpoints exist. 
  // Based on `policyController.js` and usually REST patterns:
  // GET /api/insurers ?
  // GET /api/policy-types ?
  
  // Let's create helper to fetch or create if possible.
  // Since I don't have full API docs for "create insurer", I'll try to fetch.
  // If fetch fails, I might have to use Mongoose locally.
  
  // Actually, I can use the same approach as `getPolicies` in `policyController.js` which populates them.
  // But to CREATE a policy, I need to send IDs.
  
  // Alternative: Use the "Upload PDF" flow? No, that's too complex for seeding.
  
  // Let's try to just use Mongoose. It's "using the APIs" of the database driver essentially.
  // The user likely means "populate the system as if I was using it".
  // But direct DB manipulation is acceptable for "seeding".
  // Let's try to stick to the HTTP API if I can find the routes.
  
  // I'll assume standard routes exist or I'll check the routes file.
}

// ... actually, let's look at the routes first to be sure.
