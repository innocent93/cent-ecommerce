import express from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller.js';
import { requirePermission } from '../middleware/adminAuth.js';
import { PERMISSIONS } from '../constants/roles.js';
const router = express.Router();
router.get('/dashboard', requirePermission(PERMISSIONS.ORDER_VIEW), getDashboardAnalytics);
export default router;
