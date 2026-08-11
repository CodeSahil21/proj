import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().optional(),
  unitPrice: z.number().positive('Unit price must be positive'),
  currentStock: z.number().int().min(0).default(0),
  minStockQty: z.number().int().min(0).default(0),
  location: z.string().optional(),
});

const stockAdjustSchema = z.object({
  quantity: z.number().int().refine((n) => n !== 0, 'Quantity cannot be zero'),
  movementType: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  reason: z.string().optional(),
});

export async function getProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const lowStock = req.query.lowStock === 'true';

    const where: Record<string, unknown> = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = { equals: category, mode: 'insensitive' };

    if (lowStock) {
      // Field-to-field comparison requires raw query
      const lowStockProducts = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM products WHERE current_stock <= min_stock_qty AND is_active = true
      `;
      const ids = lowStockProducts.map((p: { id: string }) => p.id);
      where.id = { in: ids };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: products, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({ data });

    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = productSchema.partial().parse(req.body);

    const product = await prisma.product.update({ where: { id }, data });

    res.json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { page, limit, skip } = parsePagination(req.query);

    const productExists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!productExists) throw new AppError('Product not found', 404);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: id },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where: { productId: id } }),
    ]);

    res.json({ success: true, data: movements, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const id = req.params.id as string;
    const { quantity, movementType, reason } = stockAdjustSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Product not found', 404);

    const absQty = Math.abs(quantity);
    const newStock =
      movementType === 'OUT'
        ? product.currentStock - absQty
        : product.currentStock + absQty;

    if (newStock < 0) {
      throw new AppError(
        `Insufficient stock. Available: ${product.currentStock}, Requested: ${absQty}`,
        400,
      );
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          quantity: absQty,
          movementType: movementType as 'IN' | 'OUT' | 'ADJUSTMENT',
          reason,
          createdById: req.user.userId,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: { product: updatedProduct, movement },
      message: `Stock ${movementType === 'IN' ? 'added' : movementType === 'OUT' ? 'removed' : 'adjusted'} successfully`,
    });
  } catch (err) {
    next(err);
  }
}
