import { createNotFoundHandler, createErrorHandler } from "mbkutils";

export const notFoundHandler = createNotFoundHandler({
  appName: "Unilib",
  defaultPage: "/",
  defaultPageName: "Home",
});

export const errorHandler = createErrorHandler({
  appName: "Unilib",
  defaultPage: "/",
  defaultPageName: "Home",
});

export default { notFoundHandler, errorHandler };
