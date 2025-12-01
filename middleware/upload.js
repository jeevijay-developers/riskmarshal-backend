const multer = require('multer');
const path = require('path');
const constants = require('../config/constants');

// Configure storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: constants.FILE_UPLOAD_MAX_SIZE
  },
  fileFilter: fileFilter
});

module.exports = upload;

