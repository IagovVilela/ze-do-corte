import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductSaleLineInput = {
  productId: string;
  quantity: number;
};

type Tx = Prisma.TransactionClient;

async function loadActiveProducts(
  tx: Tx,
  organizationId: string,
  lines: ProductSaleLineInput[],
) {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await tx.product.findMany({
    where: { organizationId, id: { in: ids }, isActive: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return { byId, ids };
}

async function deductStockForLines(
  tx: Tx,
  organizationId: string,
  saleId: string,
  lines: { productId: string; quantity: number; name: string }[],
  createdById: string | null,
  notePrefix: string,
) {
  for (const line of lines) {
    const product = await tx.product.findUnique({ where: { id: line.productId } });
    if (!product || product.stockQty == null) continue;
    if (product.stockQty < line.quantity) {
      throw new Error(`Estoque insuficiente para ${line.name}.`);
    }
    const balanceAfter = product.stockQty - line.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: balanceAfter },
    });
    await tx.productStockMovement.create({
      data: {
        organizationId,
        productId: product.id,
        kind: "SALE",
        quantityDelta: -line.quantity,
        balanceAfter,
        note: `${notePrefix} ${saleId}`.slice(0, 200),
        createdById,
      },
    });
  }
}

async function restoreStockForSale(
  tx: Tx,
  organizationId: string,
  saleId: string,
  createdById: string | null,
) {
  const items = await tx.productSaleItem.findMany({ where: { saleId } });
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stockQty == null) continue;
    const balanceAfter = product.stockQty + item.quantity;
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: balanceAfter },
    });
    await tx.productStockMovement.create({
      data: {
        organizationId,
        productId: product.id,
        kind: "IN",
        quantityDelta: item.quantity,
        balanceAfter,
        note: `Estorno venda ${saleId}`.slice(0, 200),
        createdById,
      },
    });
  }
}

function serializeSale(
  sale: Prisma.ProductSaleGetPayload<{ include: { items: true } }>,
) {
  return {
    id: sale.id,
    channel: sale.channel,
    clientName: sale.clientName,
    clientPhone: sale.clientPhone,
    clientEmail: sale.clientEmail,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    paidAt: sale.paidAt?.toISOString() ?? null,
    amountTotal: Number(sale.amountTotal),
    manageToken: sale.manageToken,
    note: sale.note,
    createdAt: sale.createdAt.toISOString(),
    items: sale.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.unitPrice) * i.quantity,
    })),
  };
}

export async function createCounterProductSale(input: {
  organizationId: string;
  createdById: string;
  lines: ProductSaleLineInput[];
  paymentMethod: string;
  clientName?: string | null;
  clientPhone?: string | null;
  note?: string | null;
}) {
  if (input.lines.length === 0) {
    throw new Error("Inclua ao menos um produto.");
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Quantidade inválida.");
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const { byId } = await loadActiveProducts(
      tx,
      input.organizationId,
      input.lines,
    );

    const resolved: {
      productId: string;
      quantity: number;
      name: string;
      unitPrice: Prisma.Decimal;
    }[] = [];
    let amountTotal = 0;

    for (const line of input.lines) {
      const product = byId.get(line.productId);
      if (!product) throw new Error("Produto inválido ou inativo.");
      if (product.stockQty != null && product.stockQty < line.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }
      const unit = Number(product.price);
      amountTotal += unit * line.quantity;
      resolved.push({
        productId: product.id,
        quantity: line.quantity,
        name: product.name,
        unitPrice: product.price,
      });
    }

    const created = await tx.productSale.create({
      data: {
        organizationId: input.organizationId,
        channel: "COUNTER",
        clientName: input.clientName?.trim() || null,
        clientPhone: input.clientPhone?.trim() || null,
        paymentMethod: input.paymentMethod.slice(0, 32),
        paymentStatus: "PAID",
        paidAt: new Date(),
        amountTotal,
        note: input.note?.trim()?.slice(0, 200) || null,
        createdById: input.createdById,
        stockDeducted: true,
        items: {
          create: resolved.map((r) => ({
            productId: r.productId,
            productName: r.name,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    await deductStockForLines(
      tx,
      input.organizationId,
      created.id,
      resolved.map((r) => ({
        productId: r.productId,
        quantity: r.quantity,
        name: r.name,
      })),
      input.createdById,
      "Venda balcão",
    );

    return created;
  });

  return serializeSale(sale);
}

export async function createOnlineProductSalePending(input: {
  organizationId: string;
  lines: ProductSaleLineInput[];
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
}) {
  if (input.lines.length === 0) {
    throw new Error("Inclua ao menos um produto.");
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Quantidade inválida.");
    }
  }

  const manageToken = randomUUID();

  const sale = await prisma.$transaction(async (tx) => {
    const { byId } = await loadActiveProducts(
      tx,
      input.organizationId,
      input.lines,
    );

    const resolved: {
      productId: string;
      quantity: number;
      name: string;
      unitPrice: Prisma.Decimal;
    }[] = [];
    let amountTotal = 0;

    for (const line of input.lines) {
      const product = byId.get(line.productId);
      if (!product) throw new Error("Produto inválido ou indisponível.");
      if (product.stockQty != null && product.stockQty < line.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }
      const unit = Number(product.price);
      amountTotal += unit * line.quantity;
      resolved.push({
        productId: product.id,
        quantity: line.quantity,
        name: product.name,
        unitPrice: product.price,
      });
    }

    if (amountTotal <= 0) {
      throw new Error("Valor do pedido inválido.");
    }

    const created = await tx.productSale.create({
      data: {
        organizationId: input.organizationId,
        channel: "ONLINE",
        clientName: input.clientName.trim(),
        clientPhone: input.clientPhone.trim(),
        clientEmail: input.clientEmail?.trim() || null,
        paymentStatus: "PENDING",
        amountTotal,
        manageToken,
        stockDeducted: true,
        items: {
          create: resolved.map((r) => ({
            productId: r.productId,
            productName: r.name,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    await deductStockForLines(
      tx,
      input.organizationId,
      created.id,
      resolved.map((r) => ({
        productId: r.productId,
        quantity: r.quantity,
        name: r.name,
      })),
      null,
      "Loja online",
    );

    return created;
  });

  return serializeSale(sale);
}

export async function markProductSalePaid(
  saleId: string,
  payment: { id?: string; value?: number; billingType?: string | null },
) {
  const amount =
    typeof payment.value === "number" && Number.isFinite(payment.value)
      ? payment.value
      : undefined;
  const method =
    payment.billingType?.toUpperCase() === "PIX"
      ? "PIX"
      : payment.billingType?.toUpperCase() === "CREDIT_CARD"
        ? "Cartão"
        : payment.billingType || "Asaas";

  await prisma.productSale.update({
    where: { id: saleId },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: String(method).slice(0, 32),
      asaasPaymentId: payment.id ?? undefined,
      ...(amount != null ? { amountTotal: amount } : {}),
    },
  });
}

export async function markProductSaleFailed(saleId: string) {
  await prisma.$transaction(async (tx) => {
    const sale = await tx.productSale.findUnique({ where: { id: saleId } });
    if (!sale) return;
    if (sale.paymentStatus === "PAID") {
      // Estorno após pagamento: devolve estoque se ainda estava baixado.
      if (sale.stockDeducted) {
        await restoreStockForSale(tx, sale.organizationId, sale.id, null);
        await tx.productSale.update({
          where: { id: saleId },
          data: {
            paymentStatus: "FAILED",
            stockDeducted: false,
          },
        });
      } else {
        await tx.productSale.update({
          where: { id: saleId },
          data: { paymentStatus: "FAILED" },
        });
      }
      return;
    }
    if (sale.paymentStatus === "FAILED") return;

    if (sale.stockDeducted) {
      await restoreStockForSale(tx, sale.organizationId, sale.id, null);
    }
    await tx.productSale.update({
      where: { id: saleId },
      data: {
        paymentStatus: "FAILED",
        stockDeducted: false,
      },
    });
  });
}

export async function listAdminProductSales(
  organizationId: string,
  limit = 30,
) {
  const sales = await prisma.productSale.findMany({
    where: { organizationId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return sales.map(serializeSale);
}

export async function listPublicCatalogProducts(organizationId: string) {
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [{ stockQty: null }, { stockQty: { gt: 0 } }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      stockQty: true,
    },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stockQty: p.stockQty,
  }));
}

export async function getProductSaleByManageToken(
  organizationId: string,
  manageToken: string,
) {
  const sale = await prisma.productSale.findFirst({
    where: { organizationId, manageToken },
    include: { items: true },
  });
  return sale ? serializeSale(sale) : null;
}
