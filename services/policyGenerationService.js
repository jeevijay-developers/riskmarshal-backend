const InsurancePolicy = require('../models/InsurancePolicy');
const { generatePolicyPDF } = require('../utils/pdfGenerator');
const { sendQuotationEmail } = require('../utils/emailService');
const constants = require('../config/constants');

const generatePolicy = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate('insurer')
      .populate('policyType')
      .populate('client')
      .populate('subagent');

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Check if payment is completed
    if (policy.paymentStatus !== constants.PAYMENT_STATUS.PAID) {
      throw new Error('Payment not completed');
    }

    // Generate policy PDF
    const pdfUrl = await generatePolicyPDF(policy);
    policy.policyPdfUrl = pdfUrl;
    policy.status = constants.POLICY_STATUS.ACTIVE;

    // Set policy dates if not already set
    if (!policy.policyDetails.insuranceStartDate) {
      policy.policyDetails.insuranceStartDate = new Date();
    }
    if (!policy.policyDetails.insuranceEndDate) {
      // Default to 1 year from start date
      const endDate = new Date(policy.policyDetails.insuranceStartDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      policy.policyDetails.insuranceEndDate = endDate;
    }

    await policy.save();

    // Send delivery confirmation email
    if (policy.client?.email) {
      try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const policyUrl = `${baseUrl}${pdfUrl}`;
        
        await sendQuotationEmail(
          policy.client.email,
          `Insurance Policy Generated - ${policy.policyDetails.policyNumber || policy.quotationId}`,
          `Your insurance policy has been generated successfully. Policy Number: ${policy.policyDetails.policyNumber || 'N/A'}. Download: ${policyUrl}`,
          `<p>Your insurance policy has been generated successfully.</p><p><strong>Policy Number:</strong> ${policy.policyDetails.policyNumber || 'N/A'}</p><p><a href="${policyUrl}">Download Policy</a></p>`
        );
      } catch (emailError) {
        console.error('Failed to send policy email:', emailError);
        // Don't throw - policy generation succeeded even if email fails
      }
    }

    return {
      policyId: policy._id,
      policyPdfUrl: policy.policyPdfUrl,
      status: policy.status,
      policy
    };
  } catch (error) {
    throw new Error(`Policy generation failed: ${error.message}`);
  }
};

// Add policy to central data store
const addToDataStore = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate('insurer')
      .populate('policyType')
      .populate('client')
      .populate('subagent');

    if (!policy) {
      throw new Error('Policy not found');
    }

    // This is a placeholder - implement based on your data store requirements
    // Could be another MongoDB collection, external API, file export, etc.
    const dataString = JSON.stringify({
      policyId: policy._id,
      quotationId: policy.quotationId,
      policyNumber: policy.policyDetails.policyNumber,
      insurer: policy.insurer?.companyName,
      client: policy.client?.name,
      premium: policy.premiumDetails?.finalPremium,
      status: policy.status,
      createdAt: policy.createdAt
    });

    // In production, save to data store
    // Example: await DataStore.create({ policyId, data: dataString });

    return {
      success: true,
      message: 'Policy added to data store'
    };
  } catch (error) {
    throw new Error(`Data store update failed: ${error.message}`);
  }
};

module.exports = {
  generatePolicy,
  addToDataStore
};

