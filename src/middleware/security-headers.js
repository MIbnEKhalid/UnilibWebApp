/**
 * Security Headers Middleware
 * Adds essential HTTP security headers to protect against clickjacking, MIME sniffing, and XSS.
 */

export function securityHeadersMiddleware(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
    res.removeHeader('X-Powered-By');
    next();
}

export default securityHeadersMiddleware;
