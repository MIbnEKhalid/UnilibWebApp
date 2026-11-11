import { createRateLimiter } from 'mbkutils';

// Global baseline rate limiter (General flood protection)
export const globalLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120,
    message: 'Too many requests from this IP. Please wait a minute and try again.'
});

// Stricter limiter for sensitive API / resource creation
export const apiCreationLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: 'Resource creation limit reached. Please slow down.'
});

// Stricter limiter for authentication attempts
export const authLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    message: 'Too many login attempts. Please try again after 5 minutes.'
});

export default {
    globalLimiter,
    apiCreationLimiter,
    authLimiter
};
