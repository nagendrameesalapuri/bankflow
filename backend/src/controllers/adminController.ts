import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { query, getPool } from '../db/pool';
import * as userRepo from '../repositories/userRepository';
import * as accountRepo from '../repositories/accountRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import * as auditRepo from '../repositories/auditRepository';
import { toPublicUser } from '../types/domain';
import { toPublicAccount } from '../services/accountService';
import { toPublicTransaction } from '../services/transactionService';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from '../services/auditService';
import { pushAdminActivity } from '../services/activityFeedService';
import { getRequestMeta } from '../utils/requestMeta';
import { hashValue } from '../utils/password';
import { generateAccountNumber } from '../utils/format';

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const [users, transactions] = await Promise.all([
    query<{ status: string; count: string }>('SELECT status, COUNT(*) FROM users GROUP BY status'),
    query<{ status: string; count: string }>('SELECT status, COUNT(*) FROM transactions GROUP BY status'),
  ]);
  const userCounts = Object.fromEntries(users.rows.map((r) => [r.status, Number(r.count)]));
  const txCounts = Object.fromEntries(transactions.rows.map((r) => [r.status, Number(r.count)]));
  const totalUsers = Object.values(userCounts).reduce((a, b) => a + b, 0);
  const totalTx = Object.values(txCounts).reduce((a, b) => a + b, 0);

  res.status(200).json({
    data: {
      totalUsers,
      activeUsers: userCounts.ACTIVE ?? 0,
      lockedUsers: userCounts.LOCKED ?? 0,
      disabledUsers: userCounts.DISABLED ?? 0,
      totalTransactions: totalTx,
      failedTransactions: txCounts.FAILED ?? 0,
      pendingTransactions: txCounts.PENDING ?? 0,
      successfulTransactions: txCounts.SUCCESS ?? 0,
    },
  });
});

export const systemHealth = asyncHandler(async (_req: Request, res: Response) => {
  let dbOk = true;
  try {
    await getPool().query('SELECT 1');
  } catch {
    dbOk = false;
  }
  res.status(200).json({
    data: {
      status: dbOk ? 'HEALTHY' : 'DEGRADED',
      database: dbOk ? 'CONNECTED' : 'DISCONNECTED',
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    },
  });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, status, page, limit } = req.query as unknown as {
    search?: string;
    role?: string;
    status?: string;
    page: number;
    limit: number;
  };
  const { rows, total } = await userRepo.listUsers({ search, role, status, page, limit });
  const accounts = await accountRepo.listByUserIds(rows.map((u) => u.id));
  const accountsByUser = new Map<string, ReturnType<typeof toPublicAccount>[]>();
  for (const account of accounts) {
    const list = accountsByUser.get(account.user_id) ?? [];
    list.push(toPublicAccount(account, { reveal: true }));
    accountsByUser.set(account.user_id, list);
  }

  res.status(200).json({
    data: rows.map((u) => ({ ...toPublicUser(u), accounts: accountsByUser.get(u.id) ?? [] })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, fullName, phone, address, role } = req.body;

  if (await userRepo.findByUsername(username)) {
    throw ApiError.conflict('That username is already taken.');
  }
  if (await userRepo.findByEmail(email)) {
    throw ApiError.conflict('That email is already registered.');
  }

  const passwordHash = await hashValue(password);
  const user = await userRepo.createUser({ username, email, passwordHash, fullName, phone, address, role });

  let account = null;
  if (role === 'CUSTOMER') {
    const created = await accountRepo.createAccount({
      userId: user.id,
      accountNumber: generateAccountNumber(),
      accountType: 'SAVINGS',
      openingBalance: 0,
    });
    account = toPublicAccount(created, { reveal: true });
  }

  await recordAudit({
    actorUserId: req.user!.sub,
    actorUsername: req.user!.username,
    action: 'ADMIN_CREATE_USER',
    target: user.username,
    ipAddress: getRequestMeta(req).ipAddress,
    result: 'SUCCESS',
    metadata: { role },
  });
  pushAdminActivity('USER', `${req.user!.username} created a new ${role.toLowerCase()} account for ${fullName}.`, {
    target: username,
  });

  res.status(201).json({ data: { user: toPublicUser(user), account } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const target = await userRepo.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found.');

  const { role, email, ...rest } = req.body as {
    role?: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
  };

  if (role && role !== target.role_name && req.user!.sub === target.id) {
    throw ApiError.badRequest('You cannot change your own admin role.');
  }
  if (email && email.toLowerCase() !== target.email.toLowerCase()) {
    const existing = await userRepo.findByEmail(email);
    if (existing && existing.id !== target.id) throw ApiError.conflict('That email is already registered.');
  }

  const hasProfileChanges = email !== undefined || Object.values(rest).some((v) => v !== undefined);
  if (hasProfileChanges) {
    await userRepo.updateProfile(target.id, { ...rest, email });
  }
  if (role && role !== target.role_name) {
    await userRepo.updateRole(target.id, role);
  }

  const updated = await userRepo.findById(target.id);
  await recordAudit({
    actorUserId: req.user!.sub,
    actorUsername: req.user!.username,
    action: 'ADMIN_UPDATE_USER',
    target: target.username,
    ipAddress: getRequestMeta(req).ipAddress,
    result: 'SUCCESS',
  });
  pushAdminActivity('USER', `${req.user!.username} updated ${target.username}'s account details.`, { target: target.username });

  res.status(200).json({ data: toPublicUser(updated!) });
});

async function changeUserStatus(req: Request, res: Response, status: 'ACTIVE' | 'LOCKED' | 'DISABLED') {
  const user = await userRepo.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  if (status === 'ACTIVE') await userRepo.unlockUser(user.id);
  else await userRepo.setUserStatus(user.id, status);

  await recordAudit({
    actorUserId: req.user!.sub,
    actorUsername: req.user!.username,
    action: `ADMIN_SET_USER_${status}`,
    target: user.username,
    ipAddress: getRequestMeta(req).ipAddress,
    result: 'SUCCESS',
  });
  pushAdminActivity('USER', `${req.user!.username} set ${user.username}'s status to ${status}.`, { target: user.username, status });
  res.status(200).json({ message: `User ${status.toLowerCase()}.` });
}

export const activateUser = asyncHandler((req: Request, res: Response) => changeUserStatus(req, res, 'ACTIVE'));
export const deactivateUser = asyncHandler((req: Request, res: Response) => changeUserStatus(req, res, 'DISABLED'));
export const lockUser = asyncHandler((req: Request, res: Response) => changeUserStatus(req, res, 'LOCKED'));
export const unlockUser = asyncHandler((req: Request, res: Response) => changeUserStatus(req, res, 'ACTIVE'));

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, page, limit } = req.query as unknown as {
    search?: string;
    status?: string;
    page: number;
    limit: number;
  };
  const { rows, total } = await accountRepo.listAll({ search, status, page, limit });
  res.status(200).json({
    data: rows.map((r) => ({
      ...toPublicAccount(r, { reveal: true }),
      ownerName: r.owner_name,
      ownerUsername: r.owner_username,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, page, limit } = req.query as unknown as {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  };
  const { rows, total } = await transactionRepo.adminSearch({ status, type, page, limit });
  res.status(200).json({
    data: rows.map((r) => ({
      ...toPublicTransaction(r),
      accountNumber: r.account_number,
      ownerName: r.owner_name,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const auditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { action, result, page, limit } = req.query as unknown as {
    action?: string;
    result?: string;
    page: number;
    limit: number;
  };
  const { rows, total } = await auditRepo.listAuditLogs({ action, result, page, limit });
  res.status(200).json({
    data: rows.map((r) => ({
      id: r.id,
      actorUsername: r.actor_username,
      action: r.action,
      target: r.target,
      ipAddress: r.ip_address,
      result: r.result,
      metadata: r.metadata,
      createdAt: r.created_at,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
