require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const InsurancePolicy = require('../models/InsurancePolicy');
const { getAllRenewals } = require('../services/renewalService');

// Mock request/response for controller test if needed, but we'll test service first.

async function debugRenewals() {
  try {
    console.log('Connecting to DB...');
    await connectDB();
    console.log('Connected.');

    // 1. Count all policies
    const totalPolicies = await InsurancePolicy.countDocuments();
    console.log(`\nTotal Policies in DB: ${totalPolicies}`);

    if (totalPolicies === 0) {
      console.log('❌ No policies found! Seeding failed or DB is empty.');
      process.exit(0);
    }

    // 2. Fetch one policy to inspect
    const policy = await InsurancePolicy.findOne().lean();
    console.log('\nSample Policy Details:');
    console.log('ID:', policy._id);
    console.log('Status:', policy.status);
    console.log('End Date:', policy.policyDetails?.insuranceEndDate);
    console.log('Period To:', policy.policyDetails?.periodTo);

    // 3. Test getAllRenewals Service
    console.log('\nTesting getAllRenewals service...');
    const result = await getAllRenewals();
    
    console.log('Service Result Keys:', Object.keys(result));
    console.log(`Results Found:`);
    console.log(`- All: ${result.all.length}`);
    console.log(`- Overdue: ${result.overdue.length}`);
    console.log(`- Urgent: ${result.urgent.length}`);
    console.log(`- Pending: ${result.pendingRenewal.length}`);
    console.log(`- Upcoming: ${result.upcoming.length}`);

    // Data verification
    if (result.all.length === 0) {
      console.log('\n❌ Service returned 0 policies despite existing policies.');
      console.log('Debugging Query details...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const ninetyDaysAhead = new Date(today);
      ninetyDaysAhead.setDate(today.getDate() + 90);

      console.log('Query Date Range:', thirtyDaysAgo.toISOString(), 'to', ninetyDaysAhead.toISOString());
      
      // Manual query test
      const manualQuery = await InsurancePolicy.find({
        $or: [
          { "policyDetails.insuranceEndDate": { $gte: thirtyDaysAgo, $lte: ninetyDaysAhead } },
          { "policyDetails.periodTo": { $gte: thirtyDaysAgo, $lte: ninetyDaysAhead } }
        ],
        status: { $in: ["active", "payment_approved", "expired"] }
      });
      
      console.log(`Manual Query Count: ${manualQuery.length}`);
      
      if (manualQuery.length === 0) {
        console.log('Manual query also failed. Checking why policies don\'t match.');
        
        // Inspect dates of sample policy vs range
        const pDate = new Date(policy.policyDetails.insuranceEndDate);
        console.log(`Sample Policy Date: ${pDate.toISOString()}`);
        console.log(`Is >= Start? ${pDate >= thirtyDaysAgo}`);
        console.log(`Is <= End? ${pDate <= ninetyDaysAhead}`);
        console.log(`Status match? ${["active", "payment_approved", "expired"].includes(policy.status)}`);
      }
    } else {
      console.log('\n✅ Service is working correctly. Issue might be in API or Frontend.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

debugRenewals();
