const multer = require("multer");
const path = require("path");
const constants = require("../config/constants");

// Configure storage
const storage = multer.memoryStorage();

// File filter: allow PDF and common image formats for OCR
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF or image files (jpg, png, webp, heic) are allowed"),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: constants.FILE_UPLOAD_MAX_SIZE,
  },
  fileFilter: fileFilter,
});

module.exports = upload;
