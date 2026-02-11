const PDFDocument = require("pdfkit");
const { saveBuffer } = require("./storageService");
const { generateQRCode } = require("./qrGenerator");

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(Number(value))) return "-";
  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const generateQuotationPDF = async (policy) => {
  return new Promise(async (resolve, reject) => {
    const fs = require("fs");
    const path = require("path");
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const resolveLocalPath = (relativePath) => {
            if (!relativePath) return null;
            if (/^https?:\/\//i.test(relativePath)) return null; // pdfkit won't fetch URLs
            const cleaned = relativePath.replace(/^\/?/, "");
            const fs = require("fs");
            const path = require("path");
            return path.join(__dirname, "..", cleaned);
          };
          const filename = `quotation-${
            policy.quotationId || policy._id
          }-${Date.now()}.pdf`;
          const pdfUrl = saveBuffer(buffer, filename, "quotations");
          resolve(pdfUrl);
        } catch (error) {
          reject(error);
        }
      });

      // Header
      doc.fontSize(20).text("INSURANCE QUOTATION", { align: "center" });
      doc.moveDown();

      // Policy Information
      doc.fontSize(14).text("Policy Information", { underline: true });
      doc.fontSize(10);
      doc.text(`Quotation ID: ${policy.quotationId || "N/A"}`);
      doc.text(`Policy Type: ${policy.policyType?.name || "N/A"}`);
      doc.text(`Insurer: ${policy.insurer?.companyName || "N/A"}`);
      doc.moveDown();

      // Client Information
      doc.fontSize(14).text("Client Information", { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${policy.client?.name || "N/A"}`);
      doc.text(`Address: ${policy.client?.address || "N/A"}`);
      doc.text(`Contact: ${policy.client?.contactNumber || "N/A"}`);
      if (policy.client?.email) {
        doc.text(`Email: ${policy.client.email}`);
      }
      doc.moveDown();

      // Vehicle Details
      if (policy.vehicleDetails) {
        doc.fontSize(14).text("Vehicle Details", { underline: true });
        doc.fontSize(10);
        const vd = policy.vehicleDetails;
        if (vd.manufacturer) doc.text(`Manufacturer: ${vd.manufacturer}`);
        if (vd.model) doc.text(`Model: ${vd.model}`);
        if (vd.registrationNumber)
          doc.text(`Registration: ${vd.registrationNumber}`);
        if (vd.engineNumber) doc.text(`Engine No: ${vd.engineNumber}`);
        if (vd.chassisNumber) doc.text(`Chassis No: ${vd.chassisNumber}`);
        doc.moveDown();
      }

      // Premium Details (detailed breakdown)
      if (policy.premiumDetails) {
        doc.fontSize(14).text("Premium Breakdown", { underline: true });
        doc.fontSize(10);
        const pd = policy.premiumDetails;
        const bd = pd.breakdown || {};

        // Own Damage block
        doc.text("Own Damage");
        doc.text(
          `  Basic Own Damage: ${formatCurrency(pd.ownDamage?.basicOD)}`,
        );
        if (pd.ncb) {
          const discount =
            bd.ncbDiscount ?? (pd.ownDamage?.basicOD || 0) * (pd.ncb / 100);
          doc.text(`  Less: NCB (${pd.ncb}%): -${formatCurrency(discount)}`);
        }
        if (bd.odAfterNcb !== undefined) {
          doc.text(`  Net Own Damage: ${formatCurrency(bd.odAfterNcb)}`);
        }
        if (pd.ownDamage?.addOnZeroDep)
          doc.text(
            `  Add-on: Zero Depreciation: ${formatCurrency(
              pd.ownDamage.addOnZeroDep,
            )}`,
          );
        if (pd.ownDamage?.addOnConsumables)
          doc.text(
            `  Add-on: Consumables: ${formatCurrency(
              pd.ownDamage.addOnConsumables,
            )}`,
          );
        if (pd.ownDamage?.others)
          doc.text(`  Add-on: Others: ${formatCurrency(pd.ownDamage.others)}`);
        doc.text(
          `  Total Own Damage Premium: ${formatCurrency(pd.ownDamage?.total)}`,
        );
        doc.moveDown(0.5);

        // Liability block
        doc.text("Third Party / Liability");
        doc.text(
          `  Basic Third Party Liability: ${formatCurrency(
            pd.liability?.basicTP,
          )}`,
        );
        if (pd.liability?.paCoverOwnerDriver)
          doc.text(
            `  PA to Owner Driver: ${formatCurrency(
              pd.liability.paCoverOwnerDriver,
            )}`,
          );
        if (pd.liability?.llForPaidDriver)
          doc.text(
            `  LL to Paid Driver: ${formatCurrency(
              pd.liability.llForPaidDriver,
            )}`,
          );
        if (pd.liability?.llEmployees)
          doc.text(
            `  LL for Employees: ${formatCurrency(pd.liability.llEmployees)}`,
          );
        if (pd.liability?.otherLiability)
          doc.text(
            `  Other Liability: ${formatCurrency(pd.liability.otherLiability)}`,
          );
        doc.text(
          `  Total Liability Premium: ${formatCurrency(pd.liability?.total)}`,
        );
        doc.moveDown(0.5);

        const packagePremium =
          bd.packagePremium ||
          (pd.ownDamage?.total || 0) + (pd.liability?.total || 0);
        doc.text(
          `Package Premium (OD + TP): ${formatCurrency(packagePremium)}`,
        );

        const gstRate = bd.gstRate || 18;
        if (pd.gst !== undefined) {
          const cgst = bd.gstSplit?.cgst ?? pd.gst / 2;
          const sgst = bd.gstSplit?.sgst ?? pd.gst / 2;
          doc.text(
            `GST ${gstRate}%: ${formatCurrency(pd.gst)} (CGST ${formatCurrency(
              cgst,
            )} + SGST ${formatCurrency(sgst)})`,
          );
        }

        if (pd.finalPremium !== undefined) {
          doc
            .fontSize(12)
            .text(`Total Payable Premium: ${formatCurrency(pd.finalPremium)}`, {
              bold: true,
            });
        }

        doc.moveDown(0.5);
        if (pd.compulsoryDeductible || pd.voluntaryDeductible) {
          doc.fontSize(10).text("Deductibles");
          if (pd.compulsoryDeductible)
            doc.text(
              `  Compulsory Deductible: ${formatCurrency(
                pd.compulsoryDeductible,
              )}`,
            );
          if (pd.voluntaryDeductible)
            doc.text(
              `  Voluntary Deductible: ${formatCurrency(
                pd.voluntaryDeductible,
              )}`,
            );
        }

        doc.moveDown();
      }

      // Payment Information
      doc.fontSize(14).text("Payment Information", { underline: true });
      doc.fontSize(10);
      doc.text(
        policy.paymentLink
          ? `Payment Link: ${policy.paymentLink}`
          : "Payment Link: (pending)",
      );
      doc.moveDown();

      // Terms and Conditions
      if (policy.additionalNotes?.termsConditions) {
        doc.fontSize(14).text("Terms & Conditions", { underline: true });
        doc.fontSize(9);
        doc.text(policy.additionalNotes.termsConditions, { align: "justify" });
        doc.moveDown();
      }

      // QR Code (if available)
      const qrPath = resolveLocalPath(policy.qrCodeLink);
      if (qrPath && fs.existsSync(qrPath)) {
        doc.addPage();
        doc
          .fontSize(12)
          .text("Scan QR Code for Policy Details", { align: "center" });
        doc.moveDown();

        const qrSize = 180;
        const x = (doc.page.width - qrSize) / 2;
        doc.image(qrPath, x, doc.y, { width: qrSize, height: qrSize });
        doc.moveDown(2);
        doc
          .fontSize(10)
          .text(`Quotation ID: ${policy.quotationId || policy._id}`, {
            align: "center",
          });
      }

      // Footer
      doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generatePolicyPDF = async (policy) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const filename = `policy-${
            policy.policyDetails.policyNumber || policy._id
          }-${Date.now()}.pdf`;
          const pdfUrl = saveBuffer(buffer, filename, "policies");
          resolve(pdfUrl);
        } catch (error) {
          reject(error);
        }
      });

      // Header
      doc.fontSize(20).text("INSURANCE POLICY", { align: "center" });
      doc.moveDown();

      // Policy Information
      doc.fontSize(14).text("Policy Information", { underline: true });
      doc.fontSize(10);
      doc.text(`Policy Number: ${policy.policyDetails.policyNumber || "N/A"}`);
      doc.text(`Policy Type: ${policy.policyType?.name || "N/A"}`);
      doc.text(`Insurer: ${policy.insurer?.companyName || "N/A"}`);
      doc.moveDown();

      // Client Information
      doc.fontSize(14).text("Client Information", { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${policy.client?.name || "N/A"}`);
      doc.text(`Address: ${policy.client?.address || "N/A"}`);
      doc.text(`Contact: ${policy.client?.contactNumber || "N/A"}`);
      if (policy.client?.email) {
        doc.text(`Email: ${policy.client.email}`);
      }
      doc.moveDown();

      // Vehicle Details
      if (policy.vehicleDetails) {
        doc.fontSize(14).text("Vehicle Details", { underline: true });
        doc.fontSize(10);
        const vd = policy.vehicleDetails;
        if (vd.manufacturer) doc.text(`Manufacturer: ${vd.manufacturer}`);
        if (vd.model) doc.text(`Model: ${vd.model}`);
        if (vd.registrationNumber)
          doc.text(`Registration: ${vd.registrationNumber}`);
        if (vd.engineNumber) doc.text(`Engine No: ${vd.engineNumber}`);
        if (vd.chassisNumber) doc.text(`Chassis No: ${vd.chassisNumber}`);
        doc.moveDown();
      }

      // Policy Period
      if (policy.policyDetails.insuranceStartDate) {
        doc.fontSize(14).text("Policy Period", { underline: true });
        doc.fontSize(10);
        doc.text(
          `Start Date: ${new Date(
            policy.policyDetails.insuranceStartDate,
          ).toLocaleDateString()}`,
        );
        if (policy.policyDetails.insuranceEndDate) {
          doc.text(
            `End Date: ${new Date(
              policy.policyDetails.insuranceEndDate,
            ).toLocaleDateString()}`,
          );
        }
        doc.moveDown();
      }

      // Premium Details
      if (policy.premiumDetails) {
        doc.fontSize(14).text("Premium Details", { underline: true });
        doc.fontSize(10);
        const pd = policy.premiumDetails;
        const bd = pd.breakdown || {};

        doc.text(
          `Package Premium (OD + TP): ${formatCurrency(
            bd.packagePremium ||
              (pd.ownDamage?.total || 0) + (pd.liability?.total || 0),
          )}`,
        );
        doc.text(`GST: ${formatCurrency(pd.gst)}`);
        if (pd.finalPremium !== undefined) {
          doc
            .fontSize(12)
            .text(`Total Premium: ${formatCurrency(pd.finalPremium)}`, {
              bold: true,
            });
        }

        if (pd.compulsoryDeductible || pd.voluntaryDeductible) {
          doc.moveDown(0.5);
          doc.fontSize(10).text("Deductibles");
          if (pd.compulsoryDeductible)
            doc.text(
              `  Compulsory: ${formatCurrency(pd.compulsoryDeductible)}`,
            );
          if (pd.voluntaryDeductible)
            doc.text(`  Voluntary: ${formatCurrency(pd.voluntaryDeductible)}`);
        }
        doc.moveDown();
      }

      // Terms and Conditions
      if (policy.additionalNotes?.termsConditions) {
        doc.fontSize(14).text("Terms & Conditions", { underline: true });
        doc.fontSize(9);
        doc.text(policy.additionalNotes.termsConditions, { align: "justify" });
        doc.moveDown();
      }

      // QR Code (if available)
      const qrPath = resolveLocalPath(policy.qrCodeLink);
      if (qrPath && fs.existsSync(qrPath)) {
        doc.addPage();
        doc
          .fontSize(12)
          .text("Scan QR Code for Policy Details", { align: "center" });
        doc.moveDown();

        const qrSize = 180;
        const x = (doc.page.width - qrSize) / 2;
        doc.image(qrPath, x, doc.y, { width: qrSize, height: qrSize });
        doc.moveDown(2);
        doc
          .fontSize(10)
          .text(
            `Policy/Quotation ID: ${
              policy.policyDetails.policyNumber ||
              policy.quotationId ||
              policy._id
            }`,
            {
              align: "center",
            },
          );
      }

      // Footer
      doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateQuotationPDF,
  generatePolicyPDF,
};
