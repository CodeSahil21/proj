import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Create sales user
  const salesPassword = await bcrypt.hash('Sales@123', 12);
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@erp.com',
      passwordHash: salesPassword,
      role: Role.SALES,
    },
  });

  // Create warehouse user
  const warehousePassword = await bcrypt.hash('Warehouse@123', 12);
  await prisma.user.upsert({
    where: { email: 'warehouse@erp.com' },
    update: {},
    create: {
      name: 'Warehouse User',
      email: 'warehouse@erp.com',
      passwordHash: warehousePassword,
      role: Role.WAREHOUSE,
    },
  });

  // Create accounts user
  const accountsPassword = await bcrypt.hash('Accounts@123', 12);
  await prisma.user.upsert({
    where: { email: 'accounts@erp.com' },
    update: {},
    create: {
      name: 'Accounts User',
      email: 'accounts@erp.com',
      passwordHash: accountsPassword,
      role: Role.ACCOUNTS,
    },
  });

  // Create sample products
  const products = [
    { name: 'Basmati Rice 5kg', sku: 'RICE-BAS-5K', category: 'Grains', unitPrice: 350, currentStock: 200, minStockQty: 20 },
    { name: 'Mustard Oil 1L', sku: 'OIL-MUS-1L', category: 'Oils', unitPrice: 180, currentStock: 150, minStockQty: 15 },
    { name: 'Wheat Flour 10kg', sku: 'FLOUR-WHT-10K', category: 'Grains', unitPrice: 280, currentStock: 5, minStockQty: 10 },
    { name: 'Sugar 1kg', sku: 'SUGAR-1K', category: 'Sweeteners', unitPrice: 45, currentStock: 300, minStockQty: 30 },
    { name: 'Salt 1kg', sku: 'SALT-1K', category: 'Condiments', unitPrice: 20, currentStock: 400, minStockQty: 40 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPrice,
        currentStock: p.currentStock,
        minStockQty: p.minStockQty,
      },
    });
  }

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 'seed-customer-1' },
    update: {},
    create: {
      id: 'seed-customer-1',
      name: 'Ramesh Agarwal',
      mobile: '9876543210',
      email: 'ramesh@shopmart.com',
      businessName: 'ShopMart Retail',
      gstNumber: '27AAPFU0939F1ZV',
      customerType: 'RETAILER',
      address: '12, MG Road, Mumbai',
      status: 'ACTIVE',
      createdById: salesUser.id,
    },
  });

  // Add a follow-up note
  await prisma.followUp.create({
    data: {
      customerId: customer1.id,
      note: 'Customer interested in bulk rice order for Diwali season.',
      createdById: salesUser.id,
    },
  });

  console.log('✅ Seeding complete');
  console.log('');
  console.log('📋 Demo credentials:');
  console.log('  Admin     → admin@erp.com     / Admin@123');
  console.log('  Sales     → sales@erp.com     / Sales@123');
  console.log('  Warehouse → warehouse@erp.com / Warehouse@123');
  console.log('  Accounts  → accounts@erp.com  / Accounts@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
