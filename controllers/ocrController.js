const { extractDataFromPDF, updateOCRData } = require('../services/ocrService');
const InsurancePolicy = require('../models/InsurancePolicy');
const { saveFile } = require('../utils/storageService');

// @desc    Upload PDF and extract data
// @route   POST /api/policies/upload
// @access  Private
const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    // Create a draft policy first
    const policy = await InsurancePolicy.create({
      insurer: req.body.insurerId,
      policyType: req.body.policyTypeId,
      client: req.body.clientId,
      subagent: req.body.subagentId,
      createdBy: req.user._id,
      status: 'draft',
      ocrStatus: 'pending'
    });

    // Save PDF file
    const pdfUrl = saveFile(req.file, 'uploads');

    // Extract data from PDF
    const extractedData = await extractDataFromPDF(req.file.buffer, policy._id);

    // Update policy with PDF URL
    policy.quotationPdfUrl = pdfUrl;
    await policy.save();

    res.status(200).json({
      success: true,
      data: {
        policyId: policy._id,
        extractedData,
        pdfUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Trigger OCR extraction for existing policy
// @route   POST /api/policies/:id/ocr-extract
// @access  Private
const triggerOCRExtraction = async (req, res) => {
  try {
    const policy = await InsurancePolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // This would require the PDF buffer - in production, retrieve from storage
    res.status(501).json({
      success: false,
      message: 'OCR extraction requires PDF file. Please use upload endpoint.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get OCR extracted data
// @route   GET /api/policies/:id/ocr-data
// @access  Private
const getOCRData = async (req, res) => {
  try {
    const policy = await InsurancePolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ocrStatus: policy.ocrStatus,
        extractedData: policy.ocrExtractedData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update/correct OCR extracted data
// @route   PUT /api/policies/:id/ocr-data
// @access  Private
const updateOCRDataController = async (req, res) => {
  try {
    const { correctedData } = req.body;
    const policy = await updateOCRData(req.params.id, correctedData);

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  uploadPDF,
  triggerOCRExtraction,
  getOCRData,
  updateOCRDataController
};

