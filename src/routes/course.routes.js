import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  reorderCourses,
} from '../controllers/course.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = express.Router();

// Routes GET avec authentification optionnelle (filtre si éditeur, sinon public)
router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);

// Routes protégées (POST, PUT, DELETE) avec vérification d'accès au site
router.post('/', protect, checkSiteAccess, createCourse);
router.put('/reorder', protect, checkSiteAccess, reorderCourses);
router.put('/:id', protect, checkSiteAccess, updateCourse);
router.delete('/:id', protect, deleteCourse); // Permissions vérifiées dans le controller

export default router;
