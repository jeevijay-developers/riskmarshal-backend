const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const constants = require('../config/constants');

const generateQRCode = async (data, filename = null) => {
  try {
    const qrData = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (filename) {
      const filePath = path.join(constants.UPLOAD_PATH, filename);
      await QRCode.toFile(filePath, qrData);
      return `/uploads/${filename}`;
    } else {
      // Return as data URL
      const dataUrl = await QRCode.toDataURL(qrData);
      return dataUrl;
    }
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

module.exports = {
  generateQRCode
};

