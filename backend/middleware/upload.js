const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// Ensure uploads directory exists
const ensureUploadDirs = async () => {
  const uploadDirs = [
    'uploads',
    'uploads/reports',
    'uploads/reports/land_views',
    'uploads/reports/building_exterior',
    'uploads/reports/building_interior',
    'uploads/reports/boundaries',
    'uploads/reports/location_maps'
  ];

  for (const dir of uploadDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        logger.error(`Failed to create upload directory ${dir}:`, error);
      }
    }
  }
};

// Initialize upload directories
ensureUploadDirs();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get category from request body or default to 'general'
    const category = req.body.category || 'general';
    const uploadPath = path.join('uploads', 'reports', category);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: reportId_category_timestamp_originalname
    const reportId = req.params.id || 'unknown';
    const category = req.body.category || 'general';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    // Sanitize filename
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${reportId}_${category}_${timestamp}_${sanitizedBasename}${ext}`;

    cb(null, filename);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err) {
        logger.error('Single file upload error:', err);

        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size too large. Maximum 10MB allowed.'
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: 'Unexpected field name. Use "image" field for file upload.'
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'images', maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);

    multipleUpload(req, res, (err) => {
      if (err) {
        logger.error('Multiple file upload error:', err);

        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'One or more files are too large. Maximum 10MB per file.'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: `Too many files. Maximum ${maxCount} files allowed.`
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: `Unexpected field name. Use "${fieldName}" field for file upload.`
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      next();
    });
  };
};

// Middleware for multiple categories upload
const uploadByCategory = () => {
  return (req, res, next) => {
    const fields = [
      { name: 'land_views', maxCount: 8 },
      { name: 'building_exterior', maxCount: 10 },
      { name: 'building_interior', maxCount: 15 },
      { name: 'boundaries', maxCount: 4 },
      { name: 'location_maps', maxCount: 2 }
    ];

    const categoryUpload = upload.fields(fields);

    categoryUpload(req, res, (err) => {
      if (err) {
        logger.error('Category upload error:', err);

        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'One or more files are too large. Maximum 10MB per file.'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: 'Too many files in one category. Check individual category limits.'
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      next();
    });
  };
};

// Helper function to get file info
const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/reports/${path.basename(path.dirname(file.path))}/${file.filename}`
  };
};

// Helper function to delete file
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`File deleted: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete file ${filePath}:`, error);
    return false;
  }
};

// Cleanup old files (called periodically)
const cleanupOldFiles = async (daysOld = 30) => {
  try {
    const uploadsDir = path.join('uploads', 'reports');
    const categories = await fs.readdir(uploadsDir);

    let deletedCount = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const category of categories) {
      const categoryPath = path.join(uploadsDir, category);
      const stats = await fs.stat(categoryPath);

      if (stats.isDirectory()) {
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          const filePath = path.join(categoryPath, file);
          const fileStats = await fs.stat(filePath);

          if (fileStats.mtime < cutoffDate) {
            const success = await deleteFile(filePath);
            if (success) deletedCount++;
          }
        }
      }
    }

    logger.info(`Cleanup completed: ${deletedCount} old files deleted`);
    return deletedCount;
  } catch (error) {
    logger.error('File cleanup error:', error);
    return 0;
  }
};

// Image optimization and thumbnail generation
const optimizeImage = async (filePath, quality = 80) => {
  try {
    // Try to use sharp for image optimization and thumbnail generation
    let sharp;
    try {
      sharp = require('sharp');
    } catch (e) {
      logger.info('Sharp not installed - using original images without optimization');
      return { originalPath: filePath, thumbnailPath: null };
    }

    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    const dir = path.dirname(filePath);

    const optimizedPath = path.join(dir, `${basename}_optimized${ext}`);
    const thumbnailPath = path.join(dir, `${basename}_thumb.jpg`);

    // Create optimized version (max 1920px width, quality 80)
    await sharp(filePath)
      .resize(1920, null, {
        withoutEnlargement: true,
        fastShrinkOnLoad: false
      })
      .jpeg({ quality, progressive: true })
      .toFile(optimizedPath);

    // Create thumbnail (300px width)
    await sharp(filePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);

    // Replace original with optimized version
    await deleteFile(filePath);
    await fs.rename(optimizedPath, filePath);

    logger.info(`Image optimized and thumbnail created: ${filePath}`);
    return {
      originalPath: filePath,
      thumbnailPath: thumbnailPath.replace(process.cwd(), '')
    };
  } catch (error) {
    logger.error('Image optimization error:', error);
    return { originalPath: filePath, thumbnailPath: null };
  }
};

// Generate thumbnail for existing image
const generateThumbnail = async (filePath) => {
  try {
    let sharp;
    try {
      sharp = require('sharp');
    } catch (e) {
      return null;
    }

    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const thumbnailPath = path.join(dir, `${basename}_thumb.jpg`);

    await sharp(filePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);

    return thumbnailPath.replace(process.cwd(), '');
  } catch (error) {
    logger.error('Thumbnail generation error:', error);
    return null;
  }
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadByCategory,
  getFileInfo,
  deleteFile,
  cleanupOldFiles,
  optimizeImage,
  generateThumbnail,
  ensureUploadDirs
};