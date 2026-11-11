export function responseTimeMiddleware(req, res, next) {
    res.locals.startTime = process.hrtime();
    next();
}

export default responseTimeMiddleware;
