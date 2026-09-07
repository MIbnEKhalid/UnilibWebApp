import { renderError, isJsonRequest, sendError, sanitizeErrorDetails } from "mbkauthe";

export const notFoundHandler = (req, res) => {
  console.log(`Path not found: ${req.url}`);

  if (isJsonRequest(req)) {
    return sendError(res, "The requested API route was not found.", {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      req,
    });
  }

  return renderError(res, req, {
    layout: false,
    code: 404,
    error: "Page Not Found",
    message: "The page you are looking for does not exist.",
    pagename: "Home",
    page: `/`,
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error("Unhandled error:", err);
  const statusCode = Number(err.status || err.statusCode || 500);

  if (isJsonRequest(req)) {
    return sendError(res, err, {
      statusCode,
      req,
      details: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }

  const sanitizedDetails = err.message ? sanitizeErrorDetails(err.message) : undefined;

  return renderError(res, req, {
    layout: false,
    code: statusCode,
    error: statusCode >= 500 ? "Internal Server Error" : (err.name || "Client Error"),
    message: err.message || "An unexpected error occurred. Please try again later.",
    ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
    pagename: "Home",
    page: `/`,
  });
};

export default { notFoundHandler, errorHandler };
