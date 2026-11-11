import { createNotFoundHandler, createErrorHandler } from 'mbkutils';
import { config } from '../config/env.js';

export const errorHandler = createErrorHandler({
    appName: config.appName,
    defaultPage: '/',
    defaultPageName: 'Home'
});

export const notFoundHandler = createNotFoundHandler({
    appName: config.appName,
    defaultPage: '/',
    defaultPageName: 'Home'
});

export default {
    errorHandler,
    notFoundHandler
};
