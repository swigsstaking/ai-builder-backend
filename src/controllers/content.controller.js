import Content from '../models/Content.js';

// @desc    Get content for a site/section
// @route   GET /api/content?siteId=xxx&section=xxx
// @access  Public (mais filtré si éditeur authentifié)
export const getContent = async (req, res, next) => {
  try {
    const { siteId, section, type } = req.query;

    const query = { isActive: true };
    if (siteId) query.site = siteId;
    if (section) query.section = section;
    if (type) query.type = type;
    
    // Si utilisateur authentifié ET éditeur → filtrer par sites assignés
    if (req.user && req.user.role === 'editor') {
      // Si un siteId est demandé, vérifier que l'éditeur y a accès
      if (siteId) {
        const hasAccess = req.user.sites.some(s => s.toString() === siteId.toString());
        if (!hasAccess) {
          return res.json({
            success: true,
            count: 0,
            data: [],
          });
        }
      } else {
        // Sinon, filtrer par tous ses sites assignés
        query.site = { $in: req.user.sites };
      }
    }
    // Sinon (admin ou appel public) → tout le contenu

    const content = await Content.find(query)
      .populate('site', 'name slug')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: content.length,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single content
// @route   GET /api/content/:id
// @access  Private
export const getContentById = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id).populate('site');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create content
// @route   POST /api/content
// @access  Private
export const createContent = async (req, res, next) => {
  try {
    const content = await Content.create(req.body);

    res.status(201).json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private
export const updateContent = async (req, res, next) => {
  try {
    // Trouver le document
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    // Mettre à jour les champs
    Object.assign(content, req.body);
    
    // FORCER Mongoose à détecter les changements dans les objets imbriqués
    if (req.body.data) {
      content.markModified('data');
    }
    
    // Sauvegarder
    await content.save();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private
export const deleteContent = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
