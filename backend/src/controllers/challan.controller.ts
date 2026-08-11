import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { generateChallanNumber } from '../utils/challanNumber.js';

const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
});

const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export async function getChallans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { challanNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, mobile: true, businessName: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({ success: true, data: challans, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function createChallan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { customerId, items, notes } = createChallanSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found or inactive', 400);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalQuantity = 0;
    let totalAmount = 0;

    const challanItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const subtotal = item.quantity * item.unitPrice;
      totalQuantity += item.quantity;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        productSnapshot: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: subtotal,
      };
    });

    const challanNumber = await generateChallanNumber();

    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId,
        customerSnapshot: {
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          businessName: customer.businessName,
          gstNumber: customer.gstNumber,
          address: customer.address,
        },
        totalQuantity,
        totalAmount: totalAmount,
        notes,
        createdById: req.user.userId,
        items: { create: challanItems },
      },
      include: {
        customer: { select: { id: true, name: true, mobile: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    res.status(201).json({ success: true, data: challan, message: 'Challan created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getChallan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } },
        },
      },
    });

    if (!challan) throw new AppError('Challan not found', 404);

    res.json({ success: true, data: challan });
  } catch (err) {
    next(err);
  }
}

export async function confirmChallan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const id = req.params.id as string;

    // Load challan with items in same query
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) throw new AppError('Challan not found', 404);
    if (challan.status !== 'DRAFT') {
      throw new AppError(`Cannot confirm a challan with status: ${challan.status}`, 400);
    }

    const productIds = challan.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of challan.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new AppError(`Product not found: ${item.productId}`, 400);
      if (product.currentStock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Required: ${item.quantity}`,
          400,
        );
      }
    }

    const userId = req.user.userId;

    await prisma.$transaction([
      prisma.challan.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      }),
      ...challan.items.flatMap((item) => [
        prisma.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        }),
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: `Challan ${challan.challanNumber} confirmed`,
            referenceId: challan.id,
            createdById: userId,
          },
        }),
      ]),
    ]);

    const updated = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, mobile: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    res.json({ success: true, data: updated, message: 'Challan confirmed and stock deducted' });
  } catch (err) {
    next(err);
  }
}

export async function cancelChallan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const id = req.params.id as string;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!challan) throw new AppError('Challan not found', 404);

    if (challan.status === 'CANCELLED') {
      throw new AppError('Challan is already cancelled', 400);
    }

    const userId = req.user.userId;

    if (challan.status === 'CONFIRMED') {
      // Restore stock for each item in a transaction
      await prisma.$transaction([
        prisma.challan.update({
          where: { id },
          data: { status: 'CANCELLED' },
        }),
        ...challan.items.flatMap((item) => [
          prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          }),
          prisma.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: 'IN',
              reason: `Challan ${challan.challanNumber} cancelled — stock restored`,
              referenceId: challan.id,
              createdById: userId,
            },
          }),
        ]),
      ]);
    } else {
      // DRAFT — just cancel, no stock to restore
      await prisma.challan.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    }

    const updated = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: challan.status === 'CONFIRMED'
        ? 'Challan cancelled and stock restored'
        : 'Challan cancelled',
    });
  } catch (err) {
    next(err);
  }
}
