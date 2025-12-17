require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/database");
const PolicyType = require("../models/PolicyType");
const Insurer = require("../models/Insurer");
const User = require("../models/User");

const policyTypes = [
  // Motor
  {
    name: "TWP - EV",
    code: "MOT-TWP-EV",
    category: "Motor",
    subCategory: "Two Wheeler",
    type: "EV",
    tags: ["Motor", "TwoWheeler", "EV"],
  },
  {
    name: "TWP - Non-EV",
    code: "MOT-TWP-NON-EV",
    category: "Motor",
    subCategory: "Two Wheeler",
    type: "Non-EV",
    tags: ["Motor", "TwoWheeler"],
  },
  {
    name: "PCP",
    code: "MOT-PCP",
    category: "Motor",
    subCategory: "Private Car Package",
    type: "PCP",
    tags: ["Motor", "Car"],
  },
  {
    name: "CVI",
    code: "MOT-CVI",
    category: "Motor",
    subCategory: "Commercial Vehicle",
    type: "CVI",
    tags: ["Motor", "Commercial"],
  },
  {
    name: "PCV",
    code: "MOT-PCV",
    category: "Motor",
    subCategory: "Passenger Carrying Vehicle",
    type: "PCV",
    tags: ["Motor", "Commercial"],
  },
  {
    name: "Misc D",
    code: "MOT-MISCD",
    category: "Motor",
    subCategory: "Miscellaneous D",
    type: "Misc D",
    tags: ["Motor"],
  },

  // Non-Motor
  {
    name: "Fire",
    code: "NM-FIRE",
    category: "Non-Motor",
    subCategory: "Fire",
    type: "Fire",
    tags: ["Non-Motor"],
  },
  {
    name: "Burglary",
    code: "NM-BURGLARY",
    category: "Non-Motor",
    subCategory: "Burglary",
    type: "Burglary",
    tags: ["Non-Motor"],
  },
  {
    name: "Package - Traclus",
    code: "NM-PKG-TRACLUS",
    category: "Non-Motor",
    subCategory: "Package",
    type: "Traclus",
    tags: ["Non-Motor", "Package"],
  },
  {
    name: "Package - MSME",
    code: "NM-PKG-MSME",
    category: "Non-Motor",
    subCategory: "Package",
    type: "MSME",
    tags: ["Non-Motor", "Package"],
  },
  {
    name: "Package - Jewellers",
    code: "NM-PKG-JEWELLERS",
    category: "Non-Motor",
    subCategory: "Package",
    type: "Jewellers",
    tags: ["Non-Motor", "Package"],
  },
  {
    name: "CAR/CPM/EAR",
    code: "NM-CAR-CPM-EAR",
    category: "Non-Motor",
    subCategory: "Engineering",
    type: "CAR/CPM/EAR",
    tags: ["Non-Motor", "Engineering"],
  },
  {
    name: "WC",
    code: "NM-WC",
    category: "Non-Motor",
    subCategory: "Workmen Compensation",
    type: "WC",
    tags: ["Non-Motor"],
  },
  {
    name: "Liability (PL/CGL)",
    code: "NM-LIAB-PL-CGL",
    category: "Non-Motor",
    subCategory: "Liability",
    type: "PL/CGL",
    tags: ["Non-Motor", "Liability"],
  },
  {
    name: "GPA",
    code: "NM-GPA",
    category: "Non-Motor",
    subCategory: "Group Personal Accident",
    type: "GPA",
    tags: ["Non-Motor", "Group"],
  },
  {
    name: "CHI",
    code: "NM-CHI",
    category: "Non-Motor",
    subCategory: "Commercial Health Insurance",
    type: "CHI",
    tags: ["Non-Motor", "Health"],
  },

  // Health
  {
    name: "Retail Health",
    code: "HL-RETAIL",
    category: "Health",
    subCategory: "Retail Health",
    type: "Retail Health",
    tags: ["Health"],
  },
  {
    name: "Personal Accident",
    code: "HL-PA",
    category: "Health",
    subCategory: "Personal Accident",
    type: "Personal Accident",
    tags: ["Health"],
  },

  // Life
  {
    name: "GIL",
    code: "LIFE-GIL",
    category: "Life",
    subCategory: "Life",
    type: "GIL",
    tags: ["Life"],
  },
  {
    name: "Term Plan",
    code: "LIFE-TERM",
    category: "Life",
    subCategory: "Life",
    type: "Term Plan",
    tags: ["Life"],
  },
  {
    name: "Gratuity",
    code: "LIFE-GRAT",
    category: "Life",
    subCategory: "Life",
    type: "Gratuity",
    tags: ["Life"],
  },
];

const insurers = [
  "HDFC ERGO",
  "ICICI Lombard",
  "IFFCO Tokio",
  "Liberty General",
  "Universal Sompo",
  "Bajaj Allianz",
  "Zuno",
  "New India Assurance",
  "Oriental Insurance",
  "United India Insurance",
  "National Insurance",
  "Future Generali",
  "Royal Sundaram",
];

const seed = async () => {
  await connectDB();

  // Seed Policy Types
  const createdTypes = [];
  for (const item of policyTypes) {
    const doc = await PolicyType.findOneAndUpdate(
      { name: item.name },
      { $set: item },
      { upsert: true, new: true }
    );
    createdTypes.push(doc._id);
  }

  // Seed Insurers
  for (const name of insurers) {
    await Insurer.findOneAndUpdate(
      { companyName: name },
      {
        companyName: name,
        productTypes: createdTypes,
      },
      { upsert: true, new: true }
    );
  }

  // Seed Default Admin User
  const adminEmail = "admin@riskmarshal.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      username: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    console.log(`Default admin user created: ${adminEmail} / admin123`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  console.log(
    `Seed completed: ${policyTypes.length} policy types, ${insurers.length} insurers.`
  );
  await mongoose.connection.close();
};

seed().catch((err) => {
  console.error(err);
  mongoose.connection.close();
  process.exit(1);
});
