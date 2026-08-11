import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required').max(15),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'INDIVIDUAL']).default('RETAILER'),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PROSPECT']).default('ACTIVE'),
  followUpDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const followUpSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

export async function getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const customerType = req.query.customerType as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (customerType) where.customerType = customerType;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data: customers, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const data = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        businessName: data.businessName,
        gstNumber: data.gstNumber,
        customerType: data.customerType as 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'INDIVIDUAL',
        address: data.address,
        status: data.status as 'ACTIVE' | 'INACTIVE' | 'PROSPECT',
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes,
        createdById: req.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { challans: true, followUps: true } },
      },
    });

    if (!customer) throw new AppError('Customer not found', 404);

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = customerSchema.partial().parse(req.body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email === '' ? null : data.email,
        customerType: data.customerType as 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'INDIVIDUAL' | undefined,
        status: data.status as 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getFollowUps(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { page, limit, skip } = parsePagination(req.query);

    const customerExists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customerExists) throw new AppError('Customer not found', 404);

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where: { customerId: id },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.followUp.count({ where: { customerId: id } }),
    ]);

    res.json({ success: true, data: followUps, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function createFollowUp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const id = req.params.id as string;
    const { note } = followUpSchema.parse(req.body);

    const customerExists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customerExists) throw new AppError('Customer not found', 404);

    const followUp = await prisma.followUp.create({
      data: { customerId: id, note, createdById: req.user.userId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: followUp, message: 'Follow-up added' });
  } catch (err) {
    next(err);
  }
}
