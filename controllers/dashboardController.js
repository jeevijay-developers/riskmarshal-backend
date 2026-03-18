const InsurancePolicy = require('../models/InsurancePolicy');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const User = require('../models/User');

// @desc    Get dashboard statistics (role-scoped)
// @route   GET /api/dashboard/stats
// @access  Authenticated
const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user._id;
    const today = new Date();

    // Build scope filter
    const scopeFilter = isAdmin ? {} : { createdBy: userId };

    // --- Client count ---
    const totalClients = await Client.countDocuments(scopeFilter);

    // --- Active policies (status: active, end date in future) ---
    const activePolicies = await InsurancePolicy.countDocuments({
      ...scopeFilter,
      status: 'active',
      'policyDetails.insuranceEndDate': { $gt: today }
    });

    // --- Pending payments (quotation_sent with paymentStatus pending) ---
    const pendingPayments = await InsurancePolicy.countDocuments({
      ...scopeFilter,
      status: { $in: ['quotation_sent', 'payment_pending'] },
      paymentStatus: 'pending'
    });

    // --- Total leads ---
    const totalLeads = await Lead.countDocuments(
      isAdmin ? {} : { $or: [{ createdBy: userId }, { assignedIntermediaryId: userId }] }
    );

    // --- Upcoming renewals (next 30 days) ---
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingRenewals = await InsurancePolicy.find({
      ...scopeFilter,
      status: 'active',
      'policyDetails.insuranceEndDate': { $gte: today, $lte: thirtyDaysFromNow }
    })
      .populate('client', 'name email contactNumber')
      .populate('insurer', 'companyName')
      .populate('policyType', 'name')
      .sort({ 'policyDetails.insuranceEndDate': 1 })
      .limit(20)
      .lean();

    // Add daysUntilExpiry to each renewal
    const upcomingRenewalsWithDays = upcomingRenewals.map(p => {
      const endDate = new Date(p.policyDetails?.insuranceEndDate);
      const diffMs = endDate - today;
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...p, daysUntilExpiry };
    });

    // --- Revenue: sum of finalPremium for paid policies ---
    const revenueAgg = await InsurancePolicy.aggregate([
      {
        $match: {
          ...(isAdmin ? {} : { createdBy: userId }),
          status: { $in: ['active', 'payment_approved'] },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$premiumDetails.finalPremium' }
        }
      }
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // --- Admin-only: commission summary per agent ---
    let commissionSummary = null;
    let renewalHealth = null;
    let totalAgents = null;

    if (isAdmin) {
      // Commission summary per agent
      const commAgg = await InsurancePolicy.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: '$createdBy',
            totalCommission: { $sum: '$commission' },
            paidCommission: {
              $sum: { $cond: [{ $eq: ['$commissionStatus', 'paid'] }, '$commission', 0] }
            },
            pendingCommission: {
              $sum: { $cond: [{ $eq: ['$commissionStatus', 'pending'] }, '$commission', 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent'
          }
        },
        { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            agentName: { $concat: ['$agent.firstName', ' ', '$agent.lastName'] },
            agentEmail: '$agent.email',
            agentUsername: '$agent.username',
            totalCommission: 1,
            paidCommission: 1,
            pendingCommission: 1
          }
        }
      ]);
      commissionSummary = commAgg;

      // Renewal health (this month)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const renewed = await InsurancePolicy.countDocuments({
        renewalStatus: 'renewed',
        updatedAt: { $gte: startOfMonth }
      });
      const lapsed = await InsurancePolicy.countDocuments({
        renewalStatus: 'lapsed',
        updatedAt: { $gte: startOfMonth }
      });
      renewalHealth = { renewed, lapsed };

      totalAgents = await User.countDocuments({ role: 'agent', isActive: true });
    }

    res.status(200).json({
      success: true,
      data: {
        totalClients,
        activePolicies,
        pendingPayments,
        totalLeads,
        totalRevenue,
        upcomingRenewals: upcomingRenewalsWithDays,
        ...(isAdmin && { commissionSummary, renewalHealth, totalAgents })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
