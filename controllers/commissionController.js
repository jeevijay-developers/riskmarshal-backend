const InsurancePolicy = require('../models/InsurancePolicy');
const Insurer = require('../models/Insurer');

// @desc    Get aggregated commission data from policies
// @route   GET /api/commissions
// @access  Admin
const getCommissions = async (req, res) => {
  try {
    const filter = { paymentStatus: 'paid' };
    if (req.query.intermediaryId) filter.createdBy = req.query.intermediaryId;
    if (req.query.insurerId) filter.insurer = req.query.insurerId;
    if (req.query.commissionStatus) filter.commissionStatus = req.query.commissionStatus;

    const { page = 1, limit = 50 } = req.query;

    const policies = await InsurancePolicy.find(filter)
      .populate('client', 'name')
      .populate('insurer', 'companyName')
      .populate('policyType', 'name')
      .populate('createdBy', 'username firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await InsurancePolicy.countDocuments(filter);

    // Aggregate totals
    const totalsAgg = await InsurancePolicy.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commission' },
          paidCommission: {
            $sum: { $cond: [{ $eq: ['$commissionStatus', 'paid'] }, '$commission', 0] }
          },
          pendingCommission: {
            $sum: { $cond: [{ $eq: ['$commissionStatus', 'pending'] }, '$commission', 0] }
          }
        }
      }
    ]);
    const totals = totalsAgg[0] || { totalCommission: 0, paidCommission: 0, pendingCommission: 0 };

    res.status(200).json({
      success: true,
      count: policies.length,
      total,
      totals,
      data: policies.map(p => ({
        _id: p._id,
        policyNumber: p.policyDetails?.policyNumber,
        client: p.client,
        insurer: p.insurer,
        policyType: p.policyType,
        agent: p.createdBy,
        premiumAmount: p.premiumDetails?.finalPremium,
        commissionRate: null, // stored on insurer
        commission: p.commission,
        commissionStatus: p.commissionStatus,
        paymentApprovedAt: p.paymentApprovedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get commission rate configuration (from insurer commission rates)
// @route   GET /api/commissions/config
// @access  Admin
const getCommissionConfig = async (req, res) => {
  try {
    const insurers = await Insurer.find({ isActive: true })
      .populate('commissionRates.policyType', 'name')
      .select('companyName commissionRates')
      .lean();

    res.status(200).json({ success: true, data: insurers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set/update commission rates on an insurer for given policy types
// @route   POST /api/commissions/configure
// @access  Admin
const configureCommissionRates = async (req, res) => {
  try {
    const { insurerId, commissionRates } = req.body;
    // commissionRates: [{ policyType: ObjectId, rate: Number, fixedAmount: Number }]

    if (!insurerId || !commissionRates) {
      return res.status(400).json({ success: false, message: 'insurerId and commissionRates are required' });
    }

    const insurer = await Insurer.findById(insurerId);
    if (!insurer) {
      return res.status(404).json({ success: false, message: 'Insurer not found' });
    }

    insurer.commissionRates = commissionRates;
    await insurer.save();

    await insurer.populate('commissionRates.policyType', 'name');

    res.status(200).json({ success: true, data: insurer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update commission status for a specific policy
// @route   PUT /api/commissions/:policyId/status
// @access  Admin
const updateCommissionStatus = async (req, res) => {
  try {
    const { commissionStatus } = req.body;
    if (!commissionStatus || !['pending', 'paid', 'reconciled'].includes(commissionStatus)) {
      return res.status(400).json({ success: false, message: 'Valid commissionStatus required: pending | paid | reconciled' });
    }

    const policy = await InsurancePolicy.findByIdAndUpdate(
      req.params.policyId,
      { commissionStatus },
      { new: true }
    )
      .populate('client', 'name')
      .populate('insurer', 'companyName')
      .populate('createdBy', 'username firstName lastName');

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCommissions, getCommissionConfig, configureCommissionRates, updateCommissionStatus };
