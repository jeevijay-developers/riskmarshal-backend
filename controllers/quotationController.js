const InsurancePolicy = require('../models/InsurancePolicy');

// @desc    List all quotations (policies with quotation_sent status), scoped by role
// @route   GET /api/quotations
// @access  Authenticated
const getQuotations = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = {
      status: { $in: ['quotation_sent', 'payment_pending', 'payment_approved'] },
      ...(isAdmin ? {} : { createdBy: req.user._id })
    };

    const { page = 1, limit = 20, paymentStatus } = req.query;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const quotations = await InsurancePolicy.find(filter)
      .populate('client', 'name email contactNumber')
      .populate('insurer', 'companyName')
      .populate('policyType', 'name')
      .populate('createdBy', 'username firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await InsurancePolicy.countDocuments(filter);

    // Add days since quotation sent
    const now = new Date();
    const result = quotations.map(q => {
      const sentAt = new Date(q.updatedAt);
      const daysSinceSent = Math.floor((now - sentAt) / (1000 * 60 * 60 * 24));
      return { ...q, daysSinceSent };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      total,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List all PENDING payment quotations, scoped by role
// @route   GET /api/quotations/pending
// @access  Authenticated
const getPendingQuotations = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = {
      status: { $in: ['quotation_sent', 'payment_pending'] },
      paymentStatus: 'pending',
      ...(isAdmin ? {} : { createdBy: req.user._id })
    };

    const quotations = await InsurancePolicy.find(filter)
      .populate('client', 'name email contactNumber')
      .populate('insurer', 'companyName')
      .populate('policyType', 'name')
      .populate('createdBy', 'username firstName lastName email')
      .sort({ updatedAt: -1 })
      .lean();

    const now = new Date();
    const result = quotations.map(q => {
      const sentAt = new Date(q.updatedAt);
      const daysSinceSent = Math.floor((now - sentAt) / (1000 * 60 * 60 * 24));
      return { ...q, daysSinceSent };
    });

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payment status of a quotation (policy)
// @route   PUT /api/quotations/:id/status
// @access  Authenticated (scoped)
const updateQuotationStatus = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { paymentStatus } = req.body;

    if (!paymentStatus || !['pending', 'paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Valid paymentStatus is required: pending | paid | failed'
      });
    }

    const filter = {
      _id: req.params.id,
      ...(isAdmin ? {} : { createdBy: req.user._id })
    };

    const policy = await InsurancePolicy.findOne(filter);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    policy.paymentStatus = paymentStatus;

    if (paymentStatus === 'paid') {
      // Move policy to active status
      policy.status = 'active';
      policy.paymentApprovedBy = req.user._id;
      policy.paymentApprovedAt = new Date();

      // Auto-calculate commission if insurer has commission rates
      const InsurancePolicy = require('../models/InsurancePolicy');
      const Insurer = require('../models/Insurer');
      const insurer = await Insurer.findById(policy.insurer).populate('commissionRates.policyType');
      if (insurer && insurer.commissionRates?.length > 0) {
        const matchedRate = insurer.commissionRates.find(
          cr => String(cr.policyType?._id || cr.policyType) === String(policy.policyType)
        );
        if (matchedRate) {
          const premium = policy.premiumDetails?.finalPremium || 0;
          policy.commission = matchedRate.rate
            ? (premium * matchedRate.rate) / 100
            : (matchedRate.fixedAmount || 0);
          policy.commissionStatus = 'pending';
        }
      }

      // Generate renewal reminder schedule if not already set
      if (policy.policyDetails?.insuranceEndDate && policy.renewalReminderSchedule?.length === 0) {
        const endDate = new Date(policy.policyDetails.insuranceEndDate);
        const windows = [60, 30, 15, 7];
        policy.renewalReminderSchedule = windows.map(days => {
          const scheduledDate = new Date(endDate);
          scheduledDate.setDate(endDate.getDate() - days);
          return { daysBeforeExpiry: days, scheduledDate, sent: false, sentAt: null };
        });
      }
    }

    await policy.save();

    await policy.populate([
      { path: 'client', select: 'name email contactNumber' },
      { path: 'insurer', select: 'companyName' },
      { path: 'policyType', select: 'name' }
    ]);

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getQuotations, getPendingQuotations, updateQuotationStatus };
