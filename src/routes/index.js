import { Router } from 'express';
import mbkroutes, { sessPerm } from 'mbkauthe';
import { createBucketRouter } from 'mbkbucket';
import { Permissions } from '../permissions.js';
import adminRoutes from './admin.routes.js';
import apiRoutes from './api.routes.js';
import webRoutes from './web.routes.js';

const router = Router();

// Mount mbkauthe authentication routes (/login, /register, /logout, 2FA, OAuth, etc.)
router.use(mbkroutes);

// Mount mbkbucket file storage routes (/mbkbucket, /mbkbucket/upload, /mbkbucket/api/*, /mbkbucket/view/*)
router.use(createBucketRouter({
    authorization: {
        view: sessPerm(Permissions.storage.view),
        upload: sessPerm(Permissions.storage.upload),
        delete: sessPerm(Permissions.storage.delete),
    },
}));

// Mount application sub-routers
router.use('/admin', adminRoutes);
router.use('/api', apiRoutes);
router.use('/', webRoutes);

export default router;
