const http = require('http');

// Simple fetch wrapper using native http module to avoid dependencies
const fetch = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = options.body ? options.body : null;
    
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ 
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(json) 
          });
        } catch (e) {
          resolve({ 
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve({ error: 'Invalid JSON', text: data }) 
          });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(body);
    }
    req.end();
  });
};

const BASE_URL = 'http://localhost:5000/api';

const SAMPLE_USER = {
  username: 'test_renewal_user_' + Date.now(),
  email: `test_renewal_${Date.now()}@riskmarshal.com`,
  password: 'password123',
  role: 'admin', // Admin to ensure we can create insurers if needed
  firstName: 'Test',
  lastName: 'Admin',
  phone: '9876543210'
};

const INSURER_DATA = {
  companyName: "Test Insurer Ltd",
  code: "HDFC", // Example
  contactNumber: "1800-123-456",
  email: "claims@testinsurer.com",
  website: "https://testinsurer.com"
};

const POLICY_TYPES = ["Comprehensive", "Third Party", "Own Damage"];

async function main() {
  console.log('🚀 Starting Renewal Data Seeding...');
  console.log(`Target: ${BASE_URL}`);

  try {
    // 1. Register User
    console.log('\n👤 creating test user...');
    let authRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_USER)
    });
    
    let authData = await authRes.json();
    
    if (!authData.success) {
      console.log('User might check login...');
      // Try login if register failed (e.g. user exists)
      authRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SAMPLE_USER.email, password: SAMPLE_USER.password })
      });
      authData = await authRes.json();
    }

    if (!authData.success || !authData.data?.token) {
      throw new Error(`Authentication failed: ${authData.message}`);
    }

    const token = authData.data.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('✅ Authenticated');

    // 2. Get/Create Insurer
    console.log('\n🏢 Fetching/Creating Insurers...');
    let insurersRes = await fetch(`${BASE_URL}/insurers`, { headers });
    let insurersData = await insurersRes.json();
    let insurerId;

    if (insurersData.success && insurersData.data && insurersData.data.length > 0) {
      insurerId = insurersData.data[0]._id;
      console.log(`Using existing insurer: ${insurersData.data[0].companyName}`);
    } else {
      console.log('Creating new insurer...');
      const createInsurerRes = await fetch(`${BASE_URL}/insurers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(INSURER_DATA)
      });
      const createInsurerData = await createInsurerRes.json();
      if (createInsurerData.success) {
        insurerId = createInsurerData.data._id;
        console.log('✅ Insurer created');
      } else {
        // Fallback: Use a fake ID if creation fails or we can't create
        // But this will likely fail validation.
        console.warn('⚠️ Could not create insurer, attempting to continue without valid ID');
        insurerId = "65c3f1e9c9a2c1a8e0d4a1b2"; // Random ID
      }
    }

    // 3. Get Policy Types (Mocking if endpoint fails or returns empty)
    // We assume the DB has some, or we just send string if the backend allows (it expects ObjectId usually)
    // Let's check if we can fetch them.
    console.log('\n📄 Fetching Policy Types...');
    let typesRes = await fetch(`${BASE_URL}/policies/policy-types`, { headers });
    let typesData = await typesRes.json();
    let policyTypeId;

    if (typesData.success && typesData.data && typesData.data.length > 0) {
      policyTypeId = typesData.data[0]._id;
      console.log(`Using existing policy type: ${typesData.data[0].name}`);
    } else {
      console.warn('⚠️ No policy types found. Using fake ID. This might fail if validation is strict.');
      policyTypeId = "65c3f1e9c9a2c1a8e0d4a1b3"; 
    }

    // 4. Create Policies
    console.log('\n📝 Creating 12 Test Policies...');

    // Define expiry scenarios (days from now)
    const scenarios = [
      -35, -5, // Overdue (>30 days, <30 days)
      2, 5, 6, // Urgent (<= 7 days)
      10, 15, 25, // Pending (8-30 days)
      45, 60, 90, 100 // Upcoming (>30 days)
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const days = scenarios[i];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      
      const startDate = new Date(expiryDate);
      startDate.setFullYear(startDate.getFullYear() - 1);

      // Create a unique client for each policy
      const client = {
        name: `Test Client ${i+1}`,
        email: `client${Date.now()}_${i}@test.com`,
        contactNumber: `9${String(Date.now()).slice(-9)}`,
      };

      const policyData = {
        client,
        insurerId,
        policyTypeId,
        subagentId: null,
        vehicleDetails: {
          number: `MH02${String(Date.now()).slice(-4)}${i}`,
          make: "Toyota",
          model: "Innova",
          variant: "V",
          year: 2022
        },
        policyDetails: {
          policyNumber: `POL-${Date.now()}-${i}`,
          insuranceStartDate: startDate.toISOString(),
          insuranceEndDate: expiryDate.toISOString(),
          periodFrom: startDate.toISOString(),
          periodTo: expiryDate.toISOString(),
          sumInsured: 500000
        },
        premiumDetails: {
          netPremium: 10000,
          gst: 1800,
          finalPremium: 11800
        },
        status: "active" // Force active status
      };

      const res = await fetch(`${BASE_URL}/policies`, {
        method: 'POST',
        headers,
        body: JSON.stringify(policyData)
      });
      
      const data = await res.json();
      
      let statusLabel = "UNKNOWN";
      if (days < 0) statusLabel = "OVERDUE";
      else if (days <= 7) statusLabel = "URGENT";
      else if (days <= 30) statusLabel = "PENDING";
      else statusLabel = "UPCOMING";

      if (data.success) {
        console.log(`✅ [${statusLabel}] Policy created (Expires in ${days} days)`);
      } else {
        console.error(`❌ Failed to create policy: ${data.message}`);
      }
      
      // Small delay
      await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n✨ Seeding Complete!');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
  }
}

main();
