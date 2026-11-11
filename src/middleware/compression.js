import compression from 'compression';

export const compressionMiddleware = compression({
    level: 6,
    threshold: '1kb',
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
});

export default compressionMiddleware;
