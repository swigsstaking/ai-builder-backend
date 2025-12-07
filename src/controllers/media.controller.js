import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import Media from '../models/Media.js';
import Site from '../models/Site.js';

// @desc    Upload file
// @route   POST /api/media/upload
// @access  Private
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const { siteId } = req.body;
    console.log('📤 Upload - req.body:', req.body);
    console.log('📤 Upload - siteId reçu:', siteId, 'Type:', typeof siteId);
    
    if (!siteId || siteId === 'undefined' || siteId === 'null') {
      console.error('❌ Upload - siteId invalide:', { siteId, body: req.body });
      // Supprimer le fichier temporaire
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    // Vérifier que le site existe
    const site = await Site.findById(siteId);
    if (!site) {
      // Supprimer le fichier temporaire
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Créer le dossier du site s'il n'existe pas
    const baseUploadPath = process.env.UPLOAD_PATH || '/var/www/uploads';
    const siteUploadPath = path.join(baseUploadPath, site.slug);
    
    if (!fsSync.existsSync(siteUploadPath)) {
      await fs.mkdir(siteUploadPath, { recursive: true, mode: 0o775 });
      console.log(`✅ Dossier créé : ${siteUploadPath}`);
    }

    // Générer le nouveau nom de fichier et déplacer
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const newFilename = uniqueSuffix + path.extname(req.file.originalname);
    const newPath = path.join(siteUploadPath, newFilename);
    
    // Déplacer le fichier temporaire vers le dossier du site
    await fs.rename(req.file.path, newPath);
    console.log(`✅ Fichier déplacé : ${req.file.path} → ${newPath}`);

    // Construire l'URL correcte du fichier
    // Tous les uploads sont servis depuis swigs.online/uploads
    let uploadsBaseDomain = process.env.UPLOADS_DOMAIN || 'swigs.online';
    
    // Supprimer https:// ou http:// si présent
    uploadsBaseDomain = uploadsBaseDomain.replace(/^https?:\/\//, '');
    
    const fileUrl = `https://${uploadsBaseDomain}/uploads/${site.slug}/${newFilename}`;

    // Créer l'entrée dans MongoDB
    const media = await Media.create({
      filename: newFilename,
      originalName: req.file.originalname,
      url: fileUrl,
      siteId,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      url: fileUrl,
      data: media,
    });
  } catch (error) {
    // Supprimer le fichier temporaire en cas d'erreur
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Erreur suppression fichier temp:', unlinkError.message);
      }
    }
    next(error);
  }
};

// @desc    Get all uploaded files
// @route   GET /api/media?siteId=xxx
// @access  Private
export const getFiles = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    // Récupérer les médias depuis MongoDB filtrés par site
    const media = await Media.find({ siteId })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email');

    // Calculer le poids total
    const totalSize = media.reduce((sum, item) => sum + (item.size || 0), 0);

    res.json({
      success: true,
      count: media.length,
      totalSize, // en bytes
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/media/:id
// @access  Private
export const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Récupérer le média depuis MongoDB
    const media = await Media.findById(id).populate('siteId');
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found',
      });
    }

    // Construire le chemin du fichier
    const uploadsDir = process.env.UPLOAD_PATH || '/var/www/uploads';
    const filePath = path.join(uploadsDir, media.siteId.slug, media.filename);

    // Supprimer le fichier du disque
    try {
      await fs.unlink(filePath);
    } catch (fsError) {
      console.error('Error deleting file from disk:', fsError);
      // Continue même si le fichier n'existe pas sur le disque
    }

    // Supprimer l'entrée MongoDB
    await Media.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
