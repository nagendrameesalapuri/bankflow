import fs from 'fs';
import path from 'path';

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

export function saveUploadedFile(subdir: string, filename: string, buffer: Buffer): string {
  const dir = path.join(UPLOADS_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${subdir}/${filename}`;
}

export function readUploadedFile(relativeUrlPath: string): Buffer {
  const relative = relativeUrlPath.replace(/^\/uploads\//, '');
  return fs.readFileSync(path.join(UPLOADS_ROOT, relative));
}

export { UPLOADS_ROOT };
