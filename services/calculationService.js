const InsurancePolicy = require("../models/InsurancePolicy");
const Insurer = require("../models/Insurer");
const Subagent = require("../models/Subagent");

const calculatePremium = (vehicleDetails, coverageDetails) => {
  const gstRate =
    typeof coverageDetails.gstRate === "number" ? coverageDetails.gstRate : 18;
  const ncbPercent = coverageDetails.ncb || 0;

  const premium = {
    ownDamage: {
      basicOD: coverageDetails.basicOD || 0,
      addOnZeroDep: coverageDetails.addOnZeroDep || 0,
      addOnConsumables: coverageDetails.addOnConsumables || 0,
      others: coverageDetails.others || 0,
      total: 0,
    },
    liability: {
      basicTP: coverageDetails.basicTP || 0,
      paCoverOwnerDriver: coverageDetails.paCoverOwnerDriver || 0,
      llForPaidDriver: coverageDetails.llForPaidDriver || 0,
      llEmployees: coverageDetails.llEmployees || 0,
      otherLiability: coverageDetails.otherLiability || 0,
      total: 0,
    },
    netPremium: 0,
    gst: 0,
    finalPremium: 0,
    compulsoryDeductible: coverageDetails.compulsoryDeductible || 0,
    voluntaryDeductible: coverageDetails.voluntaryDeductible || 0,
    ncb: ncbPercent,
    breakdown: {},
  };

  // NCB applies on basic OD only; add-ons are charged at full value
  const ncbDiscount = (premium.ownDamage.basicOD * ncbPercent) / 100;
  const odAfterNcb = premium.ownDamage.basicOD - ncbDiscount;
  const odAddOns =
    premium.ownDamage.addOnZeroDep +
    premium.ownDamage.addOnConsumables +
    premium.ownDamage.others;
  premium.ownDamage.total = odAfterNcb + odAddOns;

  premium.liability.total =
    premium.liability.basicTP +
    premium.liability.paCoverOwnerDriver +
    premium.liability.llForPaidDriver +
    premium.liability.llEmployees +
    premium.liability.otherLiability;

  const packagePremium = premium.ownDamage.total + premium.liability.total;
  premium.netPremium = packagePremium;

  premium.gst = (packagePremium * gstRate) / 100;
  premium.finalPremium = premium.netPremium + premium.gst;

  // Store granular breakdown for PDFs/UI
  premium.breakdown = {
    ncbDiscount,
    gstRate,
    gstSplit: {
      cgst: premium.gst / 2,
      sgst: premium.gst / 2,
    },
    odAfterNcb,
    odAddOns,
    packagePremium,
    liabilityTotal: premium.liability.total,
  };

  return premium;
};

const calculateCommission = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("insurer")
      .populate("subagent");

    if (!policy) {
      throw new Error("Policy not found");
    }

    const finalPremium = policy.premiumDetails?.finalPremium || 0;
    let commissionRate = 0;

    // Check if subagent has custom commission rate
    if (policy.subagent && policy.subagent.commissionRate) {
      commissionRate = policy.subagent.commissionRate;
    } else {
      // Get commission rate from insurer for this policy type
      const insurer = policy.insurer;
      if (insurer && insurer.commissionRates) {
        const commissionConfig = insurer.commissionRates.find(
          (cr) =>
            cr.policyType &&
            cr.policyType.toString() === policy.policyType.toString()
        );

        if (commissionConfig) {
          if (commissionConfig.rate) {
            commissionRate = commissionConfig.rate;
          } else if (commissionConfig.fixedAmount) {
            // Fixed amount commission
            return commissionConfig.fixedAmount;
          }
        }
      }
    }

    // Calculate commission as percentage of premium
    const commission = (finalPremium * commissionRate) / 100;

    // Update policy with commission
    policy.commission = commission;
    await policy.save();

    return commission;
  } catch (error) {
    throw new Error(`Commission calculation failed: ${error.message}`);
  }
};

const calculateAndUpdatePolicy = async (policyId, coverageDetails) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    // Calculate premium
    const premiumDetails = calculatePremium(
      policy.vehicleDetails,
      coverageDetails
    );

    // Update policy with premium details
    policy.premiumDetails = premiumDetails;
    await policy.save();

    // Calculate commission
    const commission = await calculateCommission(policyId);

    return {
      premiumDetails,
      commission,
    };
  } catch (error) {
    throw new Error(`Policy calculation failed: ${error.message}`);
  }
};

module.exports = {
  calculatePremium,
  calculateCommission,
  calculateAndUpdatePolicy,
};
