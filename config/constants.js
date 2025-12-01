module.exports = {
  JWT_EXPIRES_IN: '7d',
  FILE_UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_PATH: './uploads',
  PDF_STORAGE_PATH: './storage/pdfs',
  POLICY_STATUS: {
    DRAFT: 'draft',
    QUOTATION_SENT: 'quotation_sent',
    PAYMENT_PENDING: 'payment_pending',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed'
  },
  COMMISSION_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    RECONCILED: 'reconciled'
  },
  OCR_STATUS: {
    PENDING: 'pending',
    EXTRACTED: 'extracted',
    REVIEWED: 'reviewed',
    CORRECTED: 'corrected'
  },
  USER_ROLES: {
    ADMIN: 'admin',
    AGENT: 'agent',
    SUBAGENT: 'subagent'
  }
};

