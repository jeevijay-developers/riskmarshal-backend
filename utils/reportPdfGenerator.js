/**
 * Report PDF Generator
 * Generates graphical PDF reports with charts
 */

const PDFDocument = require("pdfkit");
const { saveBuffer } = require("./storageService");
const {
  generatePieChart,
  generateBarChart,
  generateLineChart,
  generateStatsCard,
  formatNumber,
} = require("./chartGenerator");

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  if (typeof value !== "number") return "₹0";
  return `₹${value.toLocaleString("en-IN")}`;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Add page header
 */
const addHeader = (doc, title, subtitle) => {
  // Header background
  doc.rect(0, 0, doc.page.width, 80).fill("#ab792e");

  // Title
  doc.fillColor("white").fontSize(24).font("Helvetica-Bold").text(title, 40, 25);

  // Subtitle
  doc.fontSize(11).font("Helvetica").text(subtitle, 40, 55);

  doc.fillColor("#333");
  doc.moveDown(3);
};

/**
 * Add section title
 */
const addSectionTitle = (doc, title) => {
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#ab792e")
    .text(title, { underline: false });
  doc.moveDown(0.5);
  doc.fillColor("#333").font("Helvetica").fontSize(10);
};

/**
 * Add stats summary box
 */
const addStatsSummary = (doc, stats) => {
  const startY = doc.y;
  const boxWidth = 130;
  const boxHeight = 60;
  const gap = 15;
  const cols = Math.min(stats.length, 4);

  stats.slice(0, 4).forEach((stat, index) => {
    const x = 40 + index * (boxWidth + gap);
    const y = startY;

    // Box background
    doc.rect(x, y, boxWidth, boxHeight).fill("#f8f9fa");

    // Value
    doc
      .fillColor("#ab792e")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(stat.value, x + 10, y + 12, { width: boxWidth - 20 });

    // Label
    doc
      .fillColor("#666")
      .fontSize(9)
      .font("Helvetica")
      .text(stat.label, x + 10, y + 38, { width: boxWidth - 20 });
  });

  doc.fillColor("#333").font("Helvetica").fontSize(10);
  doc.y = startY + boxHeight + 20;
};

/**
 * Add a simple table
 */
const addTable = (doc, headers, rows, options = {}) => {
  const startX = options.x || 40;
  const startY = doc.y;
  const colWidths = options.colWidths || headers.map(() => 100);
  const rowHeight = 22;

  // Header row
  doc.rect(startX, startY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#f1f1f1");

  let x = startX;
  headers.forEach((header, i) => {
    doc
      .fillColor("#333")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(header, x + 5, startY + 7, { width: colWidths[i] - 10 });
    x += colWidths[i];
  });

  // Data rows
  rows.forEach((row, rowIndex) => {
    const y = startY + (rowIndex + 1) * rowHeight;
    x = startX;

    if (rowIndex % 2 === 1) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#fafafa");
    }

    row.forEach((cell, i) => {
      doc
        .fillColor("#333")
        .fontSize(9)
        .font("Helvetica")
        .text(String(cell), x + 5, y + 7, { width: colWidths[i] - 10 });
      x += colWidths[i];
    });
  });

  doc.y = startY + (rows.length + 1) * rowHeight + 15;
};

/**
 * Generate Revenue Report PDF
 */
const generateRevenueReportPDF = async (reportData, period, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const filename = `revenue_report_${Date.now()}.pdf`;
        const url = await saveBuffer(buffer, filename, "reports");
        resolve({ buffer, url, filename, size: buffer.length });
      });

      // Header
      addHeader(
        doc,
        "Revenue Report",
        `Period: ${period} (${formatDate(dateRange.start)} - ${formatDate(dateRange.end)})`
      );

      // Summary stats
      addStatsSummary(doc, [
        { label: "Total Policies", value: String(reportData.totalPolicies || 0) },
        { label: "Total Premium", value: formatCurrency(reportData.totalPremium || 0) },
        { label: "Total Remittances", value: String(reportData.totalRemittances || 0) },
        { label: "Remittance Amount", value: formatCurrency(reportData.totalRemittanceAmount || 0) },
      ]);

      doc.moveDown(1);

      // Policies by Type
      if (reportData.policiesByType && Object.keys(reportData.policiesByType).length > 0) {
        addSectionTitle(doc, "Policies by Type");

        const pieData = Object.entries(reportData.policiesByType).map(([label, value]) => ({
          label,
          value,
        }));

        // Add as table since PDFKit doesn't support SVG directly
        const tableRows = pieData.map(({ label, value }) => [
          label,
          value,
          `${((value / reportData.totalPolicies) * 100).toFixed(1)}%`,
        ]);
        addTable(doc, ["Policy Type", "Count", "Percentage"], tableRows, {
          colWidths: [200, 100, 100],
        });
      }

      doc.moveDown(1);

      // Revenue Summary
      addSectionTitle(doc, "Revenue Summary");
      doc.fontSize(10);
      doc.text(`Average Premium per Policy: ${formatCurrency(
        reportData.totalPolicies > 0 ? reportData.totalPremium / reportData.totalPolicies : 0
      )}`);
      doc.text(`Commission Rate: ~${(
        reportData.totalPremium > 0
          ? (reportData.totalRemittanceAmount / reportData.totalPremium) * 100
          : 0
      ).toFixed(1)}%`);

      // Footer
      doc.y = doc.page.height - 50;
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(`Generated on ${formatDate(new Date())} by Risk Marshal`, 40, doc.y, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Policy Report PDF
 */
const generatePolicyReportPDF = async (reportData, period, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const filename = `policy_report_${Date.now()}.pdf`;
        const url = await saveBuffer(buffer, filename, "reports");
        resolve({ buffer, url, filename, size: buffer.length });
      });

      // Header
      addHeader(
        doc,
        "Policy Overview Report",
        `Period: ${period} (${formatDate(dateRange.start)} - ${formatDate(dateRange.end)})`
      );

      // Summary stats
      addStatsSummary(doc, [
        { label: "Total Policies", value: String(reportData.totalPolicies || 0) },
        { label: "Active", value: String(reportData.activePolicies || 0) },
        { label: "Expired", value: String(reportData.expiredPolicies || 0) },
        { label: "Pending", value: String(reportData.pendingPolicies || 0) },
      ]);

      doc.moveDown(1);

      // Status breakdown
      if (reportData.policiesByStatus && Object.keys(reportData.policiesByStatus).length > 0) {
        addSectionTitle(doc, "Policies by Status");

        const tableRows = Object.entries(reportData.policiesByStatus).map(([status, count]) => [
          status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
          `${((count / reportData.totalPolicies) * 100).toFixed(1)}%`,
        ]);
        addTable(doc, ["Status", "Count", "Percentage"], tableRows, {
          colWidths: [200, 100, 100],
        });
      }

      doc.moveDown(1);

      // Financial summary
      addSectionTitle(doc, "Financial Summary");
      doc.fontSize(10);
      doc.text(`Total Premium Value: ${formatCurrency(reportData.totalPremiumValue || 0)}`);
      doc.text(`Total Coverage Value: ${formatCurrency(reportData.totalCoverage || 0)}`);
      doc.text(`Active Policy Rate: ${(
        reportData.totalPolicies > 0
          ? (reportData.activePolicies / reportData.totalPolicies) * 100
          : 0
      ).toFixed(1)}%`);

      // Footer
      doc.y = doc.page.height - 50;
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(`Generated on ${formatDate(new Date())} by Risk Marshal`, 40, doc.y, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Client Report PDF
 */
const generateClientReportPDF = async (reportData, period, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const filename = `client_report_${Date.now()}.pdf`;
        const url = await saveBuffer(buffer, filename, "reports");
        resolve({ buffer, url, filename, size: buffer.length });
      });

      // Header
      addHeader(
        doc,
        "Client Activity Report",
        `Period: ${period} (${formatDate(dateRange.start)} - ${formatDate(dateRange.end)})`
      );

      // Summary stats
      addStatsSummary(doc, [
        { label: "Total Clients", value: String(reportData.totalClients || 0) },
        { label: "New Clients", value: String(reportData.newClients || 0) },
        { label: "With Policies", value: String(reportData.clientsWithPolicies || 0) },
        { label: "Total Policies", value: String(reportData.totalPoliciesHeld || 0) },
      ]);

      doc.moveDown(1);

      // Client metrics
      addSectionTitle(doc, "Client Engagement Metrics");
      doc.fontSize(10);
      doc.text(`Client Retention Rate: ${(
        reportData.totalClients > 0
          ? (reportData.clientsWithPolicies / reportData.totalClients) * 100
          : 0
      ).toFixed(1)}%`);
      doc.text(`Average Policies per Client: ${(
        reportData.clientsWithPolicies > 0
          ? reportData.totalPoliciesHeld / reportData.clientsWithPolicies
          : 0
      ).toFixed(2)}`);
      doc.text(`New Client Growth: ${(
        reportData.totalClients > 0
          ? (reportData.newClients / reportData.totalClients) * 100
          : 0
      ).toFixed(1)}%`);

      // Footer
      doc.y = doc.page.height - 50;
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(`Generated on ${formatDate(new Date())} by Risk Marshal`, 40, doc.y, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Partner Report PDF
 */
const generatePartnerReportPDF = async (reportData, period, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const filename = `partner_report_${Date.now()}.pdf`;
        const url = await saveBuffer(buffer, filename, "reports");
        resolve({ buffer, url, filename, size: buffer.length });
      });

      // Header
      addHeader(
        doc,
        "Partner Performance Report",
        `Period: ${period} (${formatDate(dateRange.start)} - ${formatDate(dateRange.end)})`
      );

      // Summary stats
      addStatsSummary(doc, [
        { label: "Total Partners", value: String(reportData.totalPartners || 0) },
        { label: "Active Partners", value: String(reportData.activePartners || 0) },
        { label: "Policies via Partners", value: String(reportData.policiesThroughPartners || 0) },
        {
          label: "Premium via Partners",
          value: formatCurrency(reportData.premiumThroughPartners || 0),
        },
      ]);

      doc.moveDown(1);

      // Top partners
      if (reportData.topPartners && reportData.topPartners.length > 0) {
        addSectionTitle(doc, "Top Performing Partners");
        const tableRows = reportData.topPartners.map(([name, count], index) => [
          `${index + 1}`,
          name,
          count,
        ]);
        addTable(doc, ["Rank", "Partner Name", "Policies Sold"], tableRows, {
          colWidths: [50, 250, 100],
        });
      }

      // Footer
      doc.y = doc.page.height - 50;
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(`Generated on ${formatDate(new Date())} by Risk Marshal`, 40, doc.y, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Claims Report PDF
 */
const generateClaimsReportPDF = async (reportData, period, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const filename = `claims_report_${Date.now()}.pdf`;
        const url = await saveBuffer(buffer, filename, "reports");
        resolve({ buffer, url, filename, size: buffer.length });
      });

      // Header
      addHeader(
        doc,
        "Claims Analysis Report",
        `Period: ${period} (${formatDate(dateRange.start)} - ${formatDate(dateRange.end)})`
      );

      // Summary stats
      addStatsSummary(doc, [
        { label: "Total Claims", value: String(reportData.totalClaims || 0) },
        { label: "Total Claim Value", value: formatCurrency(reportData.totalClaimValue || 0) },
      ]);

      doc.moveDown(1);

      // Claims by status
      if (reportData.claimsByStatus && Object.keys(reportData.claimsByStatus).length > 0) {
        addSectionTitle(doc, "Claims by Status");
        const tableRows = Object.entries(reportData.claimsByStatus).map(([status, count]) => [
          status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
        ]);
        addTable(doc, ["Status", "Count"], tableRows, {
          colWidths: [200, 100],
        });
      } else {
        doc.fontSize(10).text("No claims data available for this period.");
      }

      // Footer
      doc.y = doc.page.height - 50;
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(`Generated on ${formatDate(new Date())} by Risk Marshal`, 40, doc.y, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Main function to generate report PDF based on type
 */
const generateReportPDF = async (report) => {
  const { type, data, period, startDate, endDate } = report;
  const dateRange = { start: startDate, end: endDate };

  switch (type) {
    case "revenue":
      return generateRevenueReportPDF(data, period, dateRange);
    case "policy":
      return generatePolicyReportPDF(data, period, dateRange);
    case "client":
      return generateClientReportPDF(data, period, dateRange);
    case "partner":
      return generatePartnerReportPDF(data, period, dateRange);
    case "claims":
      return generateClaimsReportPDF(data, period, dateRange);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
};

module.exports = {
  generateReportPDF,
  generateRevenueReportPDF,
  generatePolicyReportPDF,
  generateClientReportPDF,
  generatePartnerReportPDF,
  generateClaimsReportPDF,
};
