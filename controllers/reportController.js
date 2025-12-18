const Report = require("../models/Report");
const InsurancePolicy = require("../models/InsurancePolicy");
const Client = require("../models/Client");
const Subagent = require("../models/Subagent");
const Remittance = require("../models/Remittance");

// Get report type title
const getReportTitle = (type) => {
  const titles = {
    revenue: "Revenue Report",
    claims: "Claims Analysis",
    client: "Client Activity Report",
    partner: "Partner Performance",
    policy: "Policy Overview",
  };
  return titles[type] || "Report";
};

// Get report description
const getReportDescription = (type) => {
  const descriptions = {
    revenue: "Comprehensive revenue breakdown and analysis",
    claims: "Detailed analysis of processed claims",
    client: "Overview of client engagement and policies",
    partner: "Insurance partner metrics and KPIs",
    policy: "Complete policy status and trends overview",
  };
  return descriptions[type] || "Generated report";
};

// Calculate date range based on period
const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let start, end;

  switch (period) {
    case "this-month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "last-month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "this-quarter":
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      break;
    case "last-quarter":
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const quarter = lastQuarter < 0 ? 3 : lastQuarter;
      start = new Date(year, quarter * 3, 1);
      end = new Date(year, (quarter + 1) * 3, 0);
      break;
    case "this-year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case "custom":
      start = startDate
        ? new Date(startDate)
        : new Date(now.getFullYear(), 0, 1);
      end = endDate ? new Date(endDate) : now;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
  }

  return { start, end };
};

// Generate report data based on type
const generateReportData = async (type, userId, dateRange) => {
  const { start, end } = dateRange;
  let data = {};

  switch (type) {
    case "revenue":
      const policies = await InsurancePolicy.find({
        createdBy: userId,
        createdAt: { $gte: start, $lte: end },
      });
      const remittances = await Remittance.find({
        createdBy: userId,
        createdAt: { $gte: start, $lte: end },
      });

      data = {
        totalPolicies: policies.length,
        totalPremium: policies.reduce(
          (sum, p) => sum + (p.premiumDetails?.finalPremium || p.premium || 0),
          0
        ),
        totalRemittances: remittances.length,
        totalRemittanceAmount: remittances.reduce(
          (sum, r) => sum + (r.amount || 0),
          0
        ),
        policiesByType: policies.reduce((acc, p) => {
          const type = p.policyTypeId?.name || p.policyType || "Other";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
      };
      break;

    case "claims":
      const claimPolicies = await InsurancePolicy.find({
        createdBy: userId,
        status: { $in: ["claimed", "claim_pending"] },
        createdAt: { $gte: start, $lte: end },
      });

      data = {
        totalClaims: claimPolicies.length,
        claimsByStatus: claimPolicies.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        totalClaimValue: claimPolicies.reduce(
          (sum, p) => sum + (p.premiumDetails?.finalPremium || 0),
          0
        ),
      };
      break;

    case "client":
      const clients = await Client.find({
        createdBy: userId,
        createdAt: { $gte: start, $lte: end },
      }).populate("policies");

      data = {
        totalClients: clients.length,
        newClients: clients.filter((c) => c.createdAt >= start).length,
        clientsWithPolicies: clients.filter(
          (c) => c.policies && c.policies.length > 0
        ).length,
        totalPoliciesHeld: clients.reduce(
          (sum, c) => sum + (c.policies?.length || 0),
          0
        ),
      };
      break;

    case "partner":
      const subagents = await Subagent.find({
        createdBy: userId,
      });
      const partnerPolicies = await InsurancePolicy.find({
        createdBy: userId,
        subagentId: { $ne: null },
        createdAt: { $gte: start, $lte: end },
      }).populate("subagentId");

      data = {
        totalPartners: subagents.length,
        activePartners: subagents.filter((s) => s.status === "Active").length,
        policiesThroughPartners: partnerPolicies.length,
        premiumThroughPartners: partnerPolicies.reduce(
          (sum, p) => sum + (p.premiumDetails?.finalPremium || p.premium || 0),
          0
        ),
        topPartners: Object.entries(
          partnerPolicies.reduce((acc, p) => {
            const name = p.subagentId?.name || "Unknown";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      };
      break;

    case "policy":
      const allPolicies = await InsurancePolicy.find({
        createdBy: userId,
        createdAt: { $gte: start, $lte: end },
      });

      data = {
        totalPolicies: allPolicies.length,
        activePolicies: allPolicies.filter((p) => p.status === "active").length,
        expiredPolicies: allPolicies.filter((p) => p.status === "expired")
          .length,
        pendingPolicies: allPolicies.filter(
          (p) => p.status === "payment_pending" || p.status === "draft"
        ).length,
        policiesByStatus: allPolicies.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        totalPremiumValue: allPolicies.reduce(
          (sum, p) => sum + (p.premiumDetails?.finalPremium || p.premium || 0),
          0
        ),
        totalCoverage: allPolicies.reduce(
          (sum, p) => sum + (p.premiumDetails?.sumInsured || 0),
          0
        ),
      };
      break;

    default:
      data = { message: "Unknown report type" };
  }

  return data;
};

// Get all reports
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};

// Get report by ID
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
    });
  }
};

// Generate new report
exports.generateReport = async (req, res) => {
  try {
    const { type, format, period, startDate, endDate } = req.body;

    if (!type || !format || !period) {
      return res.status(400).json({
        success: false,
        message: "Type, format, and period are required",
      });
    }

    const dateRange = getDateRange(period, startDate, endDate);

    // Generate report data
    const reportData = await generateReportData(type, req.user.id, dateRange);

    // Format period for display
    const periodDisplay =
      period === "custom"
        ? `${new Date(startDate).toLocaleDateString()} - ${new Date(
            endDate
          ).toLocaleDateString()}`
        : period.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    const report = new Report({
      title: getReportTitle(type),
      description: getReportDescription(type),
      type,
      format,
      period: periodDisplay,
      startDate: dateRange.start,
      endDate: dateRange.end,
      status: "completed",
      data: reportData,
      fileSize: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      createdBy: req.user.id,
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: "Report generated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
};

// Delete report
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete report",
    });
  }
};

// Download report (placeholder - would generate actual file)
exports.downloadReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // In production, this would generate and stream the actual file
    // For now, return the report data as JSON
    res.json({
      success: true,
      data: report.data,
      format: report.format,
      filename: `${report.title.replace(/\s+/g, "_")}_${Date.now()}.${
        report.format
      }`,
    });
  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download report",
    });
  }
};
