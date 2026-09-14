import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as profileService from '../services/profileService';
import * as documentRepo from '../repositories/documentRepository';
import { saveUploadedFile, readUploadedFile } from '../utils/fileStorage';
import { ApiError } from '../utils/ApiError';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await profileService.getProfile(req.user!.sub) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await profileService.updateBasicProfile(req.user!.sub, req.body) });
});

export const initiateSensitiveUpdate = asyncHandler(async (req: Request, res: Response) => {
  const otp = await profileService.initiateSensitiveUpdate(req.user!.sub, req.body);
  res.status(202).json({ requiresOtp: true, ...otp });
});

export const confirmSensitiveUpdate = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await profileService.confirmSensitiveUpdate(req.user!.sub, req.body.otp) });
});

export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  res.status(200).json({ data: await profileService.uploadProfilePhoto(req.user!.sub, req.file) });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await profileService.updatePreferences(req.user!.sub, req.body) });
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const docs = await documentRepo.listByUser(req.user!.sub);
  res.status(200).json({
    data: docs.map((d) => ({
      id: d.id,
      docType: d.doc_type,
      originalFilename: d.original_filename,
      status: d.status,
      createdAt: d.created_at,
    })),
  });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  const ext = req.file.originalname.split('.').pop() ?? 'bin';
  const filename = `${req.user!.sub}-${Date.now()}.${ext}`;
  const filePath = saveUploadedFile('documents', filename, req.file.buffer);
  const doc = await documentRepo.create({
    userId: req.user!.sub,
    docType: req.body.docType ?? 'GENERAL',
    originalFilename: req.file.originalname,
    filePath,
  });
  res.status(201).json({
    data: { id: doc.id, docType: doc.doc_type, originalFilename: doc.original_filename, status: doc.status },
  });
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await documentRepo.findById(req.params.id);
  if (!doc || doc.user_id !== req.user!.sub) throw ApiError.notFound('Document not found.');
  const buffer = readUploadedFile(doc.file_path);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
  res.status(200).send(buffer);
});
