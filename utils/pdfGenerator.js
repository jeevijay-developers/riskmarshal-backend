const PDFDocument = require('pdfkit');
const { saveBuffer } = require('./storageService');
const { generateQRCode } = require('./qrGenerator');

const generateQuotationPDF = async (policy) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const filename = `quotation-${policy.quotationId || policy._id}-${Date.now()}.pdf`;
          const pdfUrl = saveBuffer(buffer, filename, 'quotations');
          resolve(pdfUrl);
        } catch (error) {
          reject(error);
        }
      });

      // Header
      doc.fontSize(20).text('INSURANCE QUOTATION', { align: 'center' });
      doc.moveDown();

      // Policy Information
      doc.fontSize(14).text('Policy Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Quotation ID: ${policy.quotationId || 'N/A'}`);
      doc.text(`Policy Type: ${policy.policyType?.name || 'N/A'}`);
      doc.text(`Insurer: ${policy.insurer?.companyName || 'N/A'}`);
      doc.moveDown();

      // Client Information
      doc.fontSize(14).text('Client Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${policy.client?.name || 'N/A'}`);
      doc.text(`Address: ${policy.client?.address || 'N/A'}`);
      doc.text(`Contact: ${policy.client?.contactNumber || 'N/A'}`);
      if (policy.client?.email) {
        doc.text(`Email: ${policy.client.email}`);
      }
      doc.moveDown();

      // Vehicle Details
      if (policy.vehicleDetails) {
        doc.fontSize(14).text('Vehicle Details', { underline: true });
        doc.fontSize(10);
        const vd = policy.vehicleDetails;
        if (vd.manufacturer) doc.text(`Manufacturer: ${vd.manufacturer}`);
        if (vd.model) doc.text(`Model: ${vd.model}`);
        if (vd.registrationNumber) doc.text(`Registration: ${vd.registrationNumber}`);
        if (vd.engineNumber) doc.text(`Engine No: ${vd.engineNumber}`);
        if (vd.chassisNumber) doc.text(`Chassis No: ${vd.chassisNumber}`);
        doc.moveDown();
      }

      // Premium Details
      if (policy.premiumDetails) {
        doc.fontSize(14).text('Premium Breakdown', { underline: true });
        doc.fontSize(10);
        const pd = policy.premiumDetails;
        
        if (pd.ownDamage) {
          doc.text('Own Damage:', { bold: true });
          if (pd.ownDamage.basicOD) doc.text(`  Basic OD: ₹${pd.ownDamage.basicOD.toFixed(2)}`, { indent: 20 });
          if (pd.ownDamage.addOnZeroDep) doc.text(`  Zero Depreciation: ₹${pd.ownDamage.addOnZeroDep.toFixed(2)}`, { indent: 20 });
          if (pd.ownDamage.addOnConsumables) doc.text(`  Consumables: ₹${pd.ownDamage.addOnConsumables.toFixed(2)}`, { indent: 20 });
          if (pd.ownDamage.total) doc.text(`  Total OD: ₹${pd.ownDamage.total.toFixed(2)}`, { indent: 20, bold: true });
        }
        
        if (pd.liability) {
          doc.moveDown(0.5);
          doc.text('Liability:', { bold: true });
          if (pd.liability.basicTP) doc.text(`  Basic TP: ₹${pd.liability.basicTP.toFixed(2)}`, { indent: 20 });
          if (pd.liability.paCoverOwnerDriver) doc.text(`  PA Owner/Driver: ₹${pd.liability.paCoverOwnerDriver.toFixed(2)}`, { indent: 20 });
          if (pd.liability.total) doc.text(`  Total Liability: ₹${pd.liability.total.toFixed(2)}`, { indent: 20, bold: true });
        }
        
        doc.moveDown();
        if (pd.netPremium) doc.text(`Net Premium: ₹${pd.netPremium.toFixed(2)}`, { bold: true });
        if (pd.gst) doc.text(`GST (18%): ₹${pd.gst.toFixed(2)}`);
        if (pd.finalPremium) {
          doc.fontSize(12).text(`Final Premium: ₹${pd.finalPremium.toFixed(2)}`, { bold: true });
        }
        doc.moveDown();
      }

      // Payment Information
      doc.fontSize(14).text('Payment Information', { underline: true });
      doc.fontSize(10);
      doc.text('Payment Link will be sent separately.');
      doc.moveDown();

      // Terms and Conditions
      if (policy.additionalNotes?.termsConditions) {
        doc.fontSize(14).text('Terms & Conditions', { underline: true });
        doc.fontSize(9);
        doc.text(policy.additionalNotes.termsConditions, { align: 'justify' });
        doc.moveDown();
      }

      // QR Code (if available)
      if (policy.qrCodeLink) {
        doc.addPage();
        doc.fontSize(12).text('Scan QR Code for Policy Details', { align: 'center' });
        doc.moveDown();
        // Note: QR code image would need to be embedded here
      }

      // Footer
      doc.fontSize(8).text(
        `Generated on: ${new Date().toLocaleString()}`,
        { align: 'center' }
      );

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

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const filename = `policy-${policy.policyDetails.policyNumber || policy._id}-${Date.now()}.pdf`;
          const pdfUrl = saveBuffer(buffer, filename, 'policies');
          resolve(pdfUrl);
        } catch (error) {
          reject(error);
        }
      });

      // Header
      doc.fontSize(20).text('INSURANCE POLICY', { align: 'center' });
      doc.moveDown();

      // Policy Information
      doc.fontSize(14).text('Policy Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Policy Number: ${policy.policyDetails.policyNumber || 'N/A'}`);
      doc.text(`Policy Type: ${policy.policyType?.name || 'N/A'}`);
      doc.text(`Insurer: ${policy.insurer?.companyName || 'N/A'}`);
      doc.moveDown();

      // Client Information
      doc.fontSize(14).text('Client Information', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${policy.client?.name || 'N/A'}`);
      doc.text(`Address: ${policy.client?.address || 'N/A'}`);
      doc.text(`Contact: ${policy.client?.contactNumber || 'N/A'}`);
      if (policy.client?.email) {
        doc.text(`Email: ${policy.client.email}`);
      }
      doc.moveDown();

      // Vehicle Details
      if (policy.vehicleDetails) {
        doc.fontSize(14).text('Vehicle Details', { underline: true });
        doc.fontSize(10);
        const vd = policy.vehicleDetails;
        if (vd.manufacturer) doc.text(`Manufacturer: ${vd.manufacturer}`);
        if (vd.model) doc.text(`Model: ${vd.model}`);
        if (vd.registrationNumber) doc.text(`Registration: ${vd.registrationNumber}`);
        if (vd.engineNumber) doc.text(`Engine No: ${vd.engineNumber}`);
        if (vd.chassisNumber) doc.text(`Chassis No: ${vd.chassisNumber}`);
        doc.moveDown();
      }

      // Policy Period
      if (policy.policyDetails.insuranceStartDate) {
        doc.fontSize(14).text('Policy Period', { underline: true });
        doc.fontSize(10);
        doc.text(`Start Date: ${new Date(policy.policyDetails.insuranceStartDate).toLocaleDateString()}`);
        if (policy.policyDetails.insuranceEndDate) {
          doc.text(`End Date: ${new Date(policy.policyDetails.insuranceEndDate).toLocaleDateString()}`);
        }
        doc.moveDown();
      }

      // Premium Details
      if (policy.premiumDetails) {
        doc.fontSize(14).text('Premium Details', { underline: true });
        doc.fontSize(10);
        const pd = policy.premiumDetails;
        if (pd.finalPremium) {
          doc.fontSize(12).text(`Total Premium: ₹${pd.finalPremium.toFixed(2)}`, { bold: true });
        }
        doc.moveDown();
      }

      // Terms and Conditions
      if (policy.additionalNotes?.termsConditions) {
        doc.fontSize(14).text('Terms & Conditions', { underline: true });
        doc.fontSize(9);
        doc.text(policy.additionalNotes.termsConditions, { align: 'justify' });
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8).text(
        `Generated on: ${new Date().toLocaleString()}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateQuotationPDF,
  generatePolicyPDF
};

