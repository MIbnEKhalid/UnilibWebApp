import fs from 'fs';
import path from 'path';
import mbkroutes from 'mbkauthe';
import { setupViewEngine as setupEngine } from 'mbkutils';

export function setupViewEngine(app) {
    const rootDir = process.cwd();
    const bucketViewsDir = path.join(rootDir, 'node_modules/mbkbucket/views');
    const extraDirs = fs.existsSync(bucketViewsDir) ? [bucketViewsDir] : [];

    setupEngine([app, mbkroutes], {
        additionalViewsDirs: extraDirs,
        additionalPartialsDirs: extraDirs,
    });
}

export default setupViewEngine;
