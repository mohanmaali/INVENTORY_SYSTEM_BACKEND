import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

// File filter for images and documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    // Archives
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, PDF, DOC, XLS, TXT, ZIP'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB default limit
  }
});

/**
 * Middleware to upload single file
 * @param {string} fieldName - Name of the form field
 * @returns {Function} - Multer middleware
 */
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

/**
 * Middleware to upload multiple files with known field name
 * @param {string} fieldName - Name of the form field
 * @param {number} maxCount - Maximum number of files
 * @returns {Function} - Multer middleware
 */
export const uploadMultiple = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware to upload any number of files without knowing field names
 * Accepts all files sent in the request (works with any field names)
 * @param {number} maxCount - Maximum total number of files (default 20)
 * @returns {Function} - Multer middleware
 */
export const uploadAny = (maxCount = 20) => {
  return upload.any();
};

/**
 * Middleware to upload multiple fields with known names
 * @param {Object} fieldDefinitions - Object with field names and max counts
 * @returns {Function} - Multer middleware
 */
export const uploadFields = (fieldDefinitions) => {
  return upload.fields(fieldDefinitions);
};

export default upload;