const {
  getPoliciesDueForRenewal,
  getOverduePolicies,
  getAllRenewals,
  getRenewalById,
  updateRenewalStatus,
  sendRenewalReminder,
  sendBulkRenewalReminders,
  processRenewal,
  getRenewalStats,
} = require("../services/renewalService");
const {
  getSchedulerStatus,
  runDailyRenewalCheck,
  updateSchedulerConfig,
} = require("../services/schedulerService");

// @desc    Get all renewals with categorization
// @route   GET /api/renewals
// @access  Private
const getAllRenewalsController = async (req, res) => {
  try {
    const { status, daysAhead } = req.query;

    let renewals;

    if (status === "overdue") {
      renewals = await getOverduePolicies();
      return res.status(200).json({
        success: true,
        count: renewals.length,
        data: renewals,
      });
    }

    if (daysAhead) {
      renewals = await getPoliciesDueForRenewal(parseInt(daysAhead));
      return res.status(200).json({
        success: true,
        count: renewals.length,
        data: renewals,
      });
    }

    // Get all categorized renewals
    const result = await getAllRenewals();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single renewal by policy ID
// @route   GET /api/renewals/:id
// @access  Private
const getRenewalByIdController = async (req, res) => {
  try {
    const renewal = await getRenewalById(req.params.id);
    res.status(200).json({
      success: true,
      data: renewal,
    });
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update renewal status and notes
// @route   PUT /api/renewals/:id
// @access  Private
const updateRenewalController = async (req, res) => {
  try {
    const { renewalStatus, notes } = req.body;
    const renewal = await updateRenewalStatus(req.params.id, {
      renewalStatus,
      notes,
    });

    res.status(200).json({
      success: true,
      data: renewal,
    });
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send renewal reminder to client
// @route   POST /api/renewals/:id/send-reminder
// @access  Private
const sendReminderController = async (req, res) => {
  try {
    const { subject, message, channels, notifyAdmin } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    const result = await sendRenewalReminder(
      req.params.id,
      { subject, message },
      channels || ["email"],
      notifyAdmin !== false
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send bulk renewal reminders
// @route   POST /api/renewals/bulk-reminder
// @access  Private
const sendBulkReminderController = async (req, res) => {
  try {
    const { daysBeforeExpiry, channels } = req.body;

    const result = await sendBulkRenewalReminders(
      daysBeforeExpiry || 30,
      channels || ["email"]
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Process renewal (roll dates, mark renewed)
// @route   PUT /api/renewals/:id/process
// @access  Private
const processRenewalController = async (req, res) => {
  try {
    const { insuranceStartDate, insuranceEndDate } = req.body || {};
    const renewal = await processRenewal(req.params.id, {
      insuranceStartDate,
      insuranceEndDate,
    });

    res.status(200).json({
      success: true,
      data: renewal,
    });
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get renewal statistics
// @route   GET /api/renewals/stats
// @access  Private
const getRenewalStatsController = async (req, res) => {
  try {
    const stats = await getRenewalStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get policies due for renewal by days
// @route   GET /api/renewals/due/:days
// @access  Private
const getPoliciesDueController = async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const policies = await getPoliciesDueForRenewal(days);

    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get overdue policies
// @route   GET /api/renewals/overdue
// @access  Private
const getOverduePoliciesController = async (req, res) => {
  try {
    const policies = await getOverduePolicies();

    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get scheduler status
// @route   GET /api/renewals/scheduler/status
// @access  Private (Admin)
const getSchedulerStatusController = async (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Manually trigger renewal check
// @route   POST /api/renewals/scheduler/trigger
// @access  Private (Admin)
const triggerRenewalCheckController = async (req, res) => {
  try {
    const results = await runDailyRenewalCheck();
    res.status(200).json({
      success: true,
      message: "Renewal check completed",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Configure scheduler settings
// @route   POST /api/renewals/scheduler/configure
// @access  Private (Admin)
const configureSchedulerController = async (req, res) => {
  try {
    const { enabled, runHour, runMinute } = req.body;
    const newConfig = updateSchedulerConfig({ enabled, runHour, runMinute });
    res.status(200).json({
      success: true,
      message: "Scheduler configuration updated",
      data: newConfig,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllRenewalsController,
  getRenewalByIdController,
  updateRenewalController,
  sendReminderController,
  sendBulkReminderController,
  processRenewalController,
  getRenewalStatsController,
  getPoliciesDueController,
  getOverduePoliciesController,
  getSchedulerStatusController,
  triggerRenewalCheckController,
  configureSchedulerController,
};
