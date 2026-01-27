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
      }).populate("policyType", "name");
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
          const type = p.policyType?.name || "Other";
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
      }).populate("policyType", "name");

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

// Helper function to generate XLSX file
const generateXLSX = async (report) => {
  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RiskMarshal";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(report.title);

  // Add title
  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = report.title;
  worksheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFAB792E" } };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  // Add period info
  worksheet.mergeCells("A2:D2");
  worksheet.getCell("A2").value = `Period: ${report.period}`;
  worksheet.getCell("A2").font = { italic: true, size: 11 };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.addRow([]); // Empty row

  const data = report.data || {};

  // Add data based on report type
  switch (report.type) {
    case "revenue":
      // Summary section
      worksheet.addRow(["Summary"]).font = { bold: true };
      worksheet.addRow(["Total Policies", data.totalPolicies || 0]);
      worksheet.addRow(["Total Premium", data.totalPremium || 0]);
      worksheet.addRow(["Total Remittances", data.totalRemittances || 0]);
      worksheet.addRow(["Remittance Amount", data.totalRemittanceAmount || 0]);
      worksheet.addRow([]);

      // Policies by Type
      if (data.policiesByType && Object.keys(data.policiesByType).length > 0) {
        worksheet.addRow(["Policies by Type"]).font = { bold: true };
        worksheet.addRow(["Policy Type", "Count", "Percentage"]).font = { bold: true };
        const total = Object.values(data.policiesByType).reduce((a, b) => a + b, 0);
        Object.entries(data.policiesByType).forEach(([type, count]) => {
          worksheet.addRow([type, count, `${((count / total) * 100).toFixed(1)}%`]);
        });
      }
      break;

    case "claims":
      worksheet.addRow(["Claims Summary"]).font = { bold: true };
      worksheet.addRow(["Total Claims", data.totalClaims || 0]);
      worksheet.addRow(["Total Claim Value", data.totalClaimValue || 0]);
      worksheet.addRow([]);

      if (data.claimsByStatus && Object.keys(data.claimsByStatus).length > 0) {
        worksheet.addRow(["Claims by Status"]).font = { bold: true };
        worksheet.addRow(["Status", "Count"]).font = { bold: true };
        Object.entries(data.claimsByStatus).forEach(([status, count]) => {
          worksheet.addRow([status, count]);
        });
      }
      break;

    case "client":
      worksheet.addRow(["Client Summary"]).font = { bold: true };
      worksheet.addRow(["Total Clients", data.totalClients || 0]);
      worksheet.addRow(["New Clients", data.newClients || 0]);
      worksheet.addRow(["Clients with Policies", data.clientsWithPolicies || 0]);
      worksheet.addRow(["Total Policies Held", data.totalPoliciesHeld || 0]);
      break;

    case "partner":
      worksheet.addRow(["Partner Summary"]).font = { bold: true };
      worksheet.addRow(["Total Partners", data.totalPartners || 0]);
      worksheet.addRow(["Active Partners", data.activePartners || 0]);
      worksheet.addRow(["Policies Through Partners", data.policiesThroughPartners || 0]);
      worksheet.addRow(["Premium Through Partners", data.premiumThroughPartners || 0]);
      worksheet.addRow([]);

      if (data.topPartners && data.topPartners.length > 0) {
        worksheet.addRow(["Top Partners"]).font = { bold: true };
        worksheet.addRow(["Partner Name", "Policy Count"]).font = { bold: true };
        data.topPartners.forEach(([name, count]) => {
          worksheet.addRow([name, count]);
        });
      }
      break;

    case "policy":
      worksheet.addRow(["Policy Summary"]).font = { bold: true };
      worksheet.addRow(["Total Policies", data.totalPolicies || 0]);
      worksheet.addRow(["Active Policies", data.activePolicies || 0]);
      worksheet.addRow(["Expired Policies", data.expiredPolicies || 0]);
      worksheet.addRow(["Pending Policies", data.pendingPolicies || 0]);
      worksheet.addRow(["Total Premium Value", data.totalPremiumValue || 0]);
      worksheet.addRow(["Total Coverage", data.totalCoverage || 0]);
      worksheet.addRow([]);

      if (data.policiesByStatus && Object.keys(data.policiesByStatus).length > 0) {
        worksheet.addRow(["Policies by Status"]).font = { bold: true };
        worksheet.addRow(["Status", "Count"]).font = { bold: true };
        Object.entries(data.policiesByStatus).forEach(([status, count]) => {
          worksheet.addRow([status, count]);
        });
      }
      break;

    default:
      // Generic data output
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === "object" && !Array.isArray(value)) {
          worksheet.addRow([key]).font = { bold: true };
          Object.entries(value).forEach(([k, v]) => {
            worksheet.addRow([k, v]);
          });
        } else if (Array.isArray(value)) {
          worksheet.addRow([key]).font = { bold: true };
          value.forEach((item) => {
            if (Array.isArray(item)) {
              worksheet.addRow(item);
            } else {
              worksheet.addRow([item]);
            }
          });
        } else {
          worksheet.addRow([key, value]);
        }
      });
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

// Helper function to generate CSV file
const generateCSV = (report) => {
  const data = report.data || {};
  const rows = [];

  // Add title and period
  rows.push([report.title]);
  rows.push([`Period: ${report.period}`]);
  rows.push([]);

  switch (report.type) {
    case "revenue":
      rows.push(["Summary"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Policies", data.totalPolicies || 0]);
      rows.push(["Total Premium", data.totalPremium || 0]);
      rows.push(["Total Remittances", data.totalRemittances || 0]);
      rows.push(["Remittance Amount", data.totalRemittanceAmount || 0]);
      rows.push([]);

      if (data.policiesByType && Object.keys(data.policiesByType).length > 0) {
        rows.push(["Policies by Type"]);
        rows.push(["Policy Type", "Count", "Percentage"]);
        const total = Object.values(data.policiesByType).reduce((a, b) => a + b, 0);
        Object.entries(data.policiesByType).forEach(([type, count]) => {
          rows.push([type, count, `${((count / total) * 100).toFixed(1)}%`]);
        });
      }
      break;

    case "claims":
      rows.push(["Claims Summary"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Claims", data.totalClaims || 0]);
      rows.push(["Total Claim Value", data.totalClaimValue || 0]);
      rows.push([]);

      if (data.claimsByStatus && Object.keys(data.claimsByStatus).length > 0) {
        rows.push(["Claims by Status"]);
        rows.push(["Status", "Count"]);
        Object.entries(data.claimsByStatus).forEach(([status, count]) => {
          rows.push([status, count]);
        });
      }
      break;

    case "client":
      rows.push(["Client Summary"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Clients", data.totalClients || 0]);
      rows.push(["New Clients", data.newClients || 0]);
      rows.push(["Clients with Policies", data.clientsWithPolicies || 0]);
      rows.push(["Total Policies Held", data.totalPoliciesHeld || 0]);
      break;

    case "partner":
      rows.push(["Partner Summary"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Partners", data.totalPartners || 0]);
      rows.push(["Active Partners", data.activePartners || 0]);
      rows.push(["Policies Through Partners", data.policiesThroughPartners || 0]);
      rows.push(["Premium Through Partners", data.premiumThroughPartners || 0]);
      rows.push([]);

      if (data.topPartners && data.topPartners.length > 0) {
        rows.push(["Top Partners"]);
        rows.push(["Partner Name", "Policy Count"]);
        data.topPartners.forEach(([name, count]) => {
          rows.push([name, count]);
        });
      }
      break;

    case "policy":
      rows.push(["Policy Summary"]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Policies", data.totalPolicies || 0]);
      rows.push(["Active Policies", data.activePolicies || 0]);
      rows.push(["Expired Policies", data.expiredPolicies || 0]);
      rows.push(["Pending Policies", data.pendingPolicies || 0]);
      rows.push(["Total Premium Value", data.totalPremiumValue || 0]);
      rows.push(["Total Coverage", data.totalCoverage || 0]);
      rows.push([]);

      if (data.policiesByStatus && Object.keys(data.policiesByStatus).length > 0) {
        rows.push(["Policies by Status"]);
        rows.push(["Status", "Count"]);
        Object.entries(data.policiesByStatus).forEach(([status, count]) => {
          rows.push([status, count]);
        });
      }
      break;

    default:
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === "object" && !Array.isArray(value)) {
          rows.push([key]);
          Object.entries(value).forEach(([k, v]) => {
            rows.push([k, v]);
          });
        } else if (Array.isArray(value)) {
          rows.push([key]);
          value.forEach((item) => {
            if (Array.isArray(item)) {
              rows.push(item);
            } else {
              rows.push([item]);
            }
          });
        } else {
          rows.push([key, value]);
        }
      });
  }

  // Convert to CSV string with proper escaping
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");

  return csvContent;
};

// Download report (generates and streams actual file based on format)
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

    const baseFilename = `${report.title.replace(/\s+/g, "_")}_${Date.now()}`;

    // Handle different formats
    if (report.format === "xlsx") {
      // Generate Excel file
      const buffer = await generateXLSX(report);
      const filename = `${baseFilename}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);

      return res.send(buffer);
    }

    if (report.format === "csv") {
      // Generate CSV file
      const csvContent = generateCSV(report);
      const buffer = Buffer.from(csvContent, "utf-8");
      const filename = `${baseFilename}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);

      return res.send(buffer);
    }

    // Default: Generate PDF
    const { generateReportPDF } = require("../utils/reportPdfGenerator");
    const { buffer, url, filename, size } = await generateReportPDF(report);

    // Update report with file info
    report.fileUrl = url;
    report.fileSize = `${(size / 1024).toFixed(1)} KB`;
    await report.save();

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    // Send the PDF buffer
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download report",
      error: error.message,
    });
  }
};
