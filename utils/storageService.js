const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');

// Ensure storage directory exists
const ensureStorageDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const saveFile = (file, subfolder = '') => {
  try {
    const storagePath = path.join(constants.PDF_STORAGE_PATH, subfolder);
    ensureStorageDir(storagePath);

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(storagePath, filename);

    fs.writeFileSync(filePath, file.buffer);
    return `/storage/pdfs/${subfolder}${subfolder ? '/' : ''}${filename}`;
  } catch (error) {
    throw new Error(`File save failed: ${error.message}`);
  }
};

const saveBuffer = (buffer, filename, subfolder = '') => {
  try {
    const storagePath = path.join(constants.PDF_STORAGE_PATH, subfolder);
    ensureStorageDir(storagePath);

    const filePath = path.join(storagePath, filename);
    fs.writeFileSync(filePath, buffer);
    return `/storage/pdfs/${subfolder}${subfolder ? '/' : ''}${filename}`;
  } catch (error) {
    throw new Error(`Buffer save failed: ${error.message}`);
  }
};

const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

module.exports = {
  saveFile,
  saveBuffer,
  deleteFile
};

