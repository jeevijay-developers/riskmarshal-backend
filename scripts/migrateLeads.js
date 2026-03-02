const mongoose = require('mongoose');
require('dotenv').config();

const Lead = require('../models/Lead');

const statusMapping = {
  "New": "new",
  "Contacted": "contacted",
  "Qualified": "in_discussion",
  "Proposal Sent": "in_discussion",
  "Closed Won": "converted",
  "Closed Lost": "lost"
};

async function migrateLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database. Starting lead status migration...");

    const leads = await Lead.find({});
    let updatedCount = 0;

    for (const lead of leads) {
      if (statusMapping[lead.status]) {
        await Lead.updateOne(
          { _id: lead._id },
          { $set: { status: statusMapping[lead.status] } }
        );
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} leads.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
    process.exit(0);
  }
}

migrateLeads();
