import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

/**
 * Convert image to WebP format with optimization
 * @param {Buffer|string} input - Image buffer or file path
 * @param {Object} options - Conversion options
 * @returns {Promise<{buffer: Buffer, info: Object}>}
 */
export const convertToWebP = async (input, options = {}) => {
  const {
    quality = 85,
    maxWidth = 1920,
    maxHeight = 1080,
  } = options;

  try {
    let sharpInstance = sharp(input);
    
    // Get image metadata
    const metadata = await sharpInstance.metadata();
    
    // Resize if larger than max dimensions while maintaining aspect ratio
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP
    const result = await sharpInstance
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      info: {
        format: 'webp',
        width: result.info.width,
        height: result.info.height,
        size: result.info.size,
        originalFormat: metadata.format,
        originalSize: metadata.size,
        compressionRatio: metadata.size ? (result.info.size / metadata.size * 100).toFixed(1) : null,
      },
    };
  } catch (error) {
    console.error('❌ WebP conversion error:', error.message);
    throw error;
  }
};

/**
 * Process uploaded image: convert to WebP and save
 * @param {Object} file - Multer file object
 * @param {string} outputDir - Directory to save the file
 * @param {string} prefix - Filename prefix
 * @returns {Promise<{filename: string, path: string, url: string, info: Object}>}
 */
export const processAndSaveImage = async (file, outputDir, prefix = '') => {
  try {
    // Ensure output directory exists
    if (!fsSync.existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true, mode: 0o775 });
    }

    // Read the uploaded file
    const inputBuffer = await fs.readFile(file.path);
    
    // Convert to WebP
    const { buffer, info } = await convertToWebP(inputBuffer);
    
    // Generate filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const filename = `${prefix}${timestamp}-${random}.webp`;
    const outputPath = path.join(outputDir, filename);
    
    // Save the WebP file
    await fs.writeFile(outputPath, buffer);
    
    // Delete the original temp file
    await fs.unlink(file.path);
    
    console.log(`✅ Image converted: ${file.originalname} → ${filename} (${info.compressionRatio}% of original)`);
    
    return {
      filename,
      path: outputPath,
      info,
      originalName: file.originalname,
    };
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(file.path);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Process multiple images
 * @param {Array} files - Array of multer file objects
 * @param {string} outputDir - Directory to save files
 * @param {string} prefix - Filename prefix
 * @returns {Promise<Array>}
 */
export const processMultipleImages = async (files, outputDir, prefix = '') => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await processAndSaveImage(file, outputDir, prefix);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to process ${file.originalname}:`, error.message);
      results.push({
        filename: null,
        error: error.message,
        originalName: file.originalname,
      });
    }
  }
  
  return results;
};

export default {
  convertToWebP,
  processAndSaveImage,
  processMultipleImages,
};
