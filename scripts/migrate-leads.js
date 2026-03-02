require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Load models
const Lead = require("../models/Lead");

const statusMapping = {
  "New": "new",
  "Contacted": "contacted",
  "Interested": "in_discussion",
  "Not Interested": "lost",
  "Quoted": "in_discussion",
  "Converted": "converted",
  // Just in case some have trailing spaces or mixed casing:
  "new": "new",
  "contacted": "contacted",
  "in_discussion": "in_discussion",
  "converted": "converted",
  "lost": "lost"
};

async function migrate() {
  try {
    console.log("Connecting to database...", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const leads = await Lead.find({});
    console.log(`Found ${leads.length} total leads.`);
    
    let updatedCount = 0;

    for (let lead of leads) {
      if (lead.status && statusMapping[lead.status] && lead.status !== statusMapping[lead.status]) {
        lead.status = statusMapping[lead.status];
        await lead.save();
        updatedCount++;
      } else if (!statusMapping[lead.status]) {
        // Fallback or unrecognized
        console.warn(`Unrecognized status '${lead.status}' on lead ${lead._id}. Defaulting to 'new'.`);
        lead.status = "new";
        await lead.save();
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} leads.`);
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

migrate();
