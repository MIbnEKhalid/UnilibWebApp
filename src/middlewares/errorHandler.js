import { renderError } from "mbkauthe";

export const notFoundHandler = (req, res) => {
  console.log(`Path not found: ${req.url}`);
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
  console.error("Unhandled error:", err);
  return renderError(res, req, {
    layout: false,
    code: 500,
    error: "Internal Server Error",
    message: "An unexpected error occurred. Please try again later.",
    pagename: "Home",
    page: `/`,
  });
};

export default { notFoundHandler, errorHandler };
