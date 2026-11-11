import multer from "multer";

const storage = multer.memoryStorage();

export const uploadResourceMiddleware = multer({
  storage,
  limits: {
    // 100MB limit for university documents, slide decks, and past papers
    fileSize: 100 * 1024 * 1024,
  },
});

export default uploadResourceMiddleware;

