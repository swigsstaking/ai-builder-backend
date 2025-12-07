import Course from '../models/Course.js';
import { invalidateCache } from '../middleware/cache.middleware.js';

// @desc    Get all courses for a site
// @route   GET /api/courses?siteId=xxx
// @access  Public (mais filtré si éditeur authentifié)
export const getCourses = async (req, res, next) => {
  try {
    const { siteId, status } = req.query;

    const query = {};
    if (siteId) query.site = siteId;
    if (status) query.status = status;
    
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
    // Sinon (admin ou appel public) → tous les cours

    const courses = await Course.find(query)
      .populate('site', 'name slug')
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('site');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private
export const createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);

    await invalidateCache('courses:*');
    await invalidateCache('course:*');

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private
export const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    await invalidateCache('courses:*');
    await invalidateCache('course:*');

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private
export const deleteCourse = async (req, res, next) => {
  try {
    // D'abord récupérer le cours pour vérifier les permissions
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Vérifier les permissions (admin ou éditeur du site)
    if (req.user.role === 'editor') {
      const hasAccess = req.user.sites.some(site => site.toString() === course.site.toString());
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'avez pas accès à ce cours',
        });
      }
    }

    // Supprimer le cours
    await Course.findByIdAndDelete(req.params.id);

    await invalidateCache('courses:*');
    await invalidateCache('course:*');

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course order
// @route   PUT /api/courses/reorder
// @access  Private
export const reorderCourses = async (req, res, next) => {
  try {
    const { courses } = req.body; // Array of { id, order }

    const updatePromises = courses.map(({ id, order }) =>
      Course.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    await invalidateCache('courses:*');
    await invalidateCache('course:*');

    res.json({
      success: true,
      message: 'Courses reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};
