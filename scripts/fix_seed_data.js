require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const InsurancePolicy = require('../models/InsurancePolicy');

async function fixSeedData() {
  try {
    console.log('Connecting to DB...');
    await connectDB();
    console.log('Connected.');

    // 1. Find policies that are draft
    const policies = await InsurancePolicy.find({ status: 'draft' });
    console.log(`Found ${policies.length} draft policies.`);

    if (policies.length === 0) {
      console.log('No draft policies to fix.');
    }

    let updatedCount = 0;

    for (const policy of policies) {
      // 2. Fix Status
      policy.status = 'active';

      // 3. Ensure Dates are set correctly (Sync periodTo -> insuranceEndDate)
      if (policy.policyDetails) {
        if (policy.policyDetails.periodTo && !policy.policyDetails.insuranceEndDate) {
          policy.policyDetails.insuranceEndDate = policy.policyDetails.periodTo;
        }
        
        // Also ensure insuranceStartDate
        if (policy.policyDetails.periodFrom && !policy.policyDetails.insuranceStartDate) {
          policy.policyDetails.insuranceStartDate = policy.policyDetails.periodFrom;
        }
      }

      await policy.save();
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} policies to 'active' status.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixSeedData();
