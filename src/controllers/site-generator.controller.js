/**
 * Site Generator Controller
 * Endpoints pour generer et telecharger des projets de site
 */

import archiver from 'archiver';
import {
  generateSiteConfig,
  generateProjectFiles,
  validateSiteConfig,
  generateSlug,
  SITE_TYPE_PAGES,
  PAGE_ROUTES,
  AVAILABLE_TEMPLATES,
  DEFAULT_COLORS,
} from '../services/site-generator.service.js';

/**
 * GET /api/site-generator/config
 * Retourne la configuration disponible (templates, types de sites, pages)
 */
export const getGeneratorConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        templates: AVAILABLE_TEMPLATES,
        siteTypes: Object.keys(SITE_TYPE_PAGES),
        pages: Object.entries(PAGE_ROUTES).map(([id, config]) => ({
          id,
          ...config,
        })),
        defaultColors: DEFAULT_COLORS,
        siteTypePages: SITE_TYPE_PAGES,
      },
    });
  } catch (error) {
    console.error('Error getting generator config:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation de la configuration',
    });
  }
};

/**
 * POST /api/site-generator/validate
 * Valide une configuration de site
 */
export const validateConfig = async (req, res) => {
  try {
    const config = generateSiteConfig(req.body);
    const validation = validateSiteConfig(config);

    res.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        config: validation.isValid ? config : null,
      },
    });
  } catch (error) {
    console.error('Error validating config:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation',
    });
  }
};

/**
 * POST /api/site-generator/preview
 * Genere un apercu de la structure du projet
 */
export const previewProject = async (req, res) => {
  try {
    const config = generateSiteConfig(req.body);
    const validation = validateSiteConfig(config);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Configuration invalide',
        errors: validation.errors,
      });
    }

    const files = generateProjectFiles(config);
    
    // Retourner la liste des fichiers sans le contenu complet
    const fileList = Object.keys(files).map(path => ({
      path,
      size: files[path].length,
      type: path.endsWith('.json') ? 'json' : 
            path.endsWith('.js') || path.endsWith('.jsx') ? 'javascript' :
            path.endsWith('.css') ? 'css' :
            path.endsWith('.html') ? 'html' :
            path.endsWith('.md') ? 'markdown' : 'text',
    }));

    res.json({
      success: true,
      data: {
        config,
        files: fileList,
        totalFiles: fileList.length,
      },
    });
  } catch (error) {
    console.error('Error previewing project:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la generation de l\'apercu',
    });
  }
};

/**
 * POST /api/site-generator/download
 * Genere et telecharge le projet en ZIP
 */
export const downloadProject = async (req, res) => {
  try {
    const config = generateSiteConfig(req.body);
    const validation = validateSiteConfig(config);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Configuration invalide',
        errors: validation.errors,
      });
    }

    const files = generateProjectFiles(config);

    // Configurer la reponse pour le telechargement
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${config.siteSlug}-project.zip"`);

    // Creer l'archive ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation de l\'archive',
      });
    });

    // Pipe l'archive vers la reponse
    archive.pipe(res);

    // Ajouter les fichiers a l'archive
    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: `${config.siteSlug}/${filePath}` });
    }

    // Finaliser l'archive
    await archive.finalize();

  } catch (error) {
    console.error('Error downloading project:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du telechargement',
    });
  }
};

/**
 * POST /api/site-generator/generate-slug
 * Genere un slug a partir d'un nom
 */
export const generateSlugEndpoint = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom est requis',
      });
    }

    const slug = generateSlug(name);

    res.json({
      success: true,
      data: { slug },
    });
  } catch (error) {
    console.error('Error generating slug:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la generation du slug',
    });
  }
};

export default {
  getGeneratorConfig,
  validateConfig,
  previewProject,
  downloadProject,
  generateSlugEndpoint,
};
