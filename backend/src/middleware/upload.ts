import multer from 'multer';

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.mimetype)) {
      cb(new Error('Only PNG, JPG, or WEBP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^(application\/pdf|image\/(png|jpeg|jpg))$/.test(file.mimetype)) {
      cb(new Error('Only PDF, PNG, or JPG documents are allowed.'));
      return;
    }
    cb(null, true);
  },
});
