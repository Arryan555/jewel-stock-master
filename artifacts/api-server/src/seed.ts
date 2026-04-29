import {
  db,
  customersTable,
  productsTable,
  invoicesTable,
  invoiceItemsTable,
  invoiceOldGoldTable,
  girviLoansTable,
  girviPaymentsTable,
  ledgerEntriesTable,
  karigarsTable,
  karigarJobsTable,
  repairJobsTable,
  estimatesTable,
  estimateItemsTable,
  schemePlansTable,
  schemeAccountsTable,
  schemeInstallmentsTable,
  shopSettingsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { computeInvoiceTotals, computeItem, nextSerial } from "./lib/calc";

async function clear() {
  await db.delete(schemeInstallmentsTable);
  await db.delete(schemeAccountsTable);
  await db.delete(schemePlansTable);
  await db.delete(estimateItemsTable);
  await db.delete(estimatesTable);
  await db.delete(repairJobsTable);
  await db.delete(karigarJobsTable);
  await db.delete(karigarsTable);
  await db.delete(invoiceOldGoldTable);
  await db.delete(invoiceItemsTable);
  await db.delete(invoicesTable);
  await db.delete(girviPaymentsTable);
  await db.delete(girviLoansTable);
  await db.delete(ledgerEntriesTable);
  await db.delete(productsTable);
  await db.delete(customersTable);
  await db.delete(shopSettingsTable);
}

async function seed() {
  await clear();

  const customers = await db
    .insert(customersTable)
    .values([
      {
        name: "Aarav Mehta",
        phone: "+91 98200 11221",
        email: "aarav.mehta@example.com",
        address: "12, Marine Drive",
        city: "Mumbai",
        type: "retail",
        gstNumber: null,
        openingBalance: "0",
      },
      {
        name: "Priya Sharma",
        phone: "+91 98800 33445",
        email: "priya.sharma@example.com",
        address: "44, MG Road",
        city: "Bengaluru",
        type: "retail",
        gstNumber: null,
        openingBalance: "0",
      },
      {
        name: "Rohan Iyer",
        phone: "+91 98401 88990",
        email: "rohan@example.com",
        city: "Chennai",
        type: "retail",
        openingBalance: "0",
      },
      {
        name: "Lakshmi Krishnan",
        phone: "+91 99000 77665",
        city: "Hyderabad",
        type: "retail",
        openingBalance: "0",
      },
      {
        name: "Sanya Kapoor",
        phone: "+91 99102 11119",
        email: "sanya@example.com",
        city: "Delhi",
        type: "retail",
        openingBalance: "0",
      },
      {
        name: "Devansh Modi",
        phone: "+91 96320 44114",
        city: "Ahmedabad",
        type: "retail",
        openingBalance: "0",
      },
      {
        name: "Ratan Jewellers Wholesale",
        phone: "+91 22 4567 8910",
        email: "purchase@ratanwholesale.in",
        address: "Zaveri Bazaar",
        city: "Mumbai",
        type: "wholesale",
        gstNumber: "27AAAPL1234C1Z5",
        openingBalance: "0",
      },
      {
        name: "Vasant Bullion Traders",
        phone: "+91 80 2345 6789",
        address: "Commercial Street",
        city: "Bengaluru",
        type: "wholesale",
        gstNumber: "29AABCV9876D1Z2",
        openingBalance: "0",
      },
    ])
    .returning();

  const products = await db
    .insert(productsTable)
    .values([
      {
        name: "Classic Gold Bangle",
        category: "Bangle",
        metal: "gold",
        purity: "22K",
        weightGrams: "12.500",
        ratePerGram: "7250",
        makingChargePercent: "12",
        stoneCharges: "0",
        hsnCode: "7113",
        gstRate: "3",
        stockQuantity: 14,
        sku: "GB-22K-12",
      },
      {
        name: "Temple Necklace Set",
        category: "Necklace",
        metal: "gold",
        purity: "22K",
        weightGrams: "48.200",
        ratePerGram: "7250",
        makingChargePercent: "15",
        stoneCharges: "8500",
        hsnCode: "7113",
        gstRate: "3",
        stockQuantity: 4,
        sku: "GN-22K-48",
      },
      {
        name: "Diamond Stud Earrings",
        category: "Earrings",
        metal: "diamond",
        purity: "VVS1",
        weightGrams: "2.300",
        ratePerGram: "0",
        makingChargePercent: "0",
        stoneCharges: "84500",
        hsnCode: "7102",
        gstRate: "1.5",
        stockQuantity: 6,
        sku: "DE-VVS-2",
      },
      {
        name: "Engagement Solitaire Ring",
        category: "Ring",
        metal: "diamond",
        purity: "VS2",
        weightGrams: "3.100",
        ratePerGram: "0",
        makingChargePercent: "0",
        stoneCharges: "168000",
        hsnCode: "7102",
        gstRate: "1.5",
        stockQuantity: 3,
        sku: "DR-VS-3",
      },
      {
        name: "Silver Payal (Anklet)",
        category: "Anklet",
        metal: "silver",
        purity: "925",
        weightGrams: "85.400",
        ratePerGram: "92",
        makingChargePercent: "8",
        stoneCharges: "0",
        hsnCode: "7113",
        gstRate: "3",
        stockQuantity: 22,
        sku: "SA-925-85",
      },
      {
        name: "Silver Pooja Thali",
        category: "Articles",
        metal: "silver",
        purity: "999",
        weightGrams: "320.000",
        ratePerGram: "98",
        makingChargePercent: "5",
        stoneCharges: "0",
        hsnCode: "7114",
        gstRate: "3",
        stockQuantity: 5,
        sku: "ST-999-320",
      },
      {
        name: "Mens Gold Chain",
        category: "Chain",
        metal: "gold",
        purity: "22K",
        weightGrams: "28.700",
        ratePerGram: "7250",
        makingChargePercent: "10",
        stoneCharges: "0",
        hsnCode: "7113",
        gstRate: "3",
        stockQuantity: 8,
        sku: "GC-22K-28",
      },
      {
        name: "Platinum Wedding Band",
        category: "Ring",
        metal: "platinum",
        purity: "950",
        weightGrams: "5.800",
        ratePerGram: "3450",
        makingChargePercent: "12",
        stoneCharges: "0",
        hsnCode: "7110",
        gstRate: "3",
        stockQuantity: 7,
        sku: "PR-950-5",
      },
      {
        name: "Gold Mangalsutra",
        category: "Necklace",
        metal: "gold",
        purity: "22K",
        weightGrams: "18.400",
        ratePerGram: "7250",
        makingChargePercent: "14",
        stoneCharges: "1200",
        hsnCode: "7113",
        gstRate: "3",
        stockQuantity: 10,
        sku: "GM-22K-18",
      },
    ])
    .returning();

  // Create some invoices spread across the last 28 days
  const today = new Date();
  const invoiceDefs: Array<{
    type: "retail" | "wholesale";
    customerId: string;
    daysAgo: number;
    items: Array<{ productId: string; paid?: number }>;
    discount?: number;
    paid?: number;
  }> = [
    {
      type: "retail",
      customerId: customers[0].id,
      daysAgo: 0,
      items: [{ productId: products[0].id }],
      paid: 1,
    },
    {
      type: "retail",
      customerId: customers[1].id,
      daysAgo: 1,
      items: [{ productId: products[8].id }, { productId: products[6].id }],
      paid: 1,
    },
    {
      type: "retail",
      customerId: customers[2].id,
      daysAgo: 3,
      items: [{ productId: products[2].id }],
      paid: 0.5,
    },
    {
      type: "retail",
      customerId: customers[3].id,
      daysAgo: 5,
      items: [{ productId: products[4].id }],
      paid: 1,
    },
    {
      type: "wholesale",
      customerId: customers[6].id,
      daysAgo: 6,
      items: [{ productId: products[5].id }, { productId: products[4].id }],
      paid: 0.6,
    },
    {
      type: "retail",
      customerId: customers[4].id,
      daysAgo: 8,
      items: [{ productId: products[1].id }],
      discount: 5000,
      paid: 1,
    },
    {
      type: "retail",
      customerId: customers[5].id,
      daysAgo: 11,
      items: [{ productId: products[7].id }],
      paid: 0,
    },
    {
      type: "wholesale",
      customerId: customers[7].id,
      daysAgo: 14,
      items: [{ productId: products[6].id }, { productId: products[0].id }],
      paid: 1,
    },
    {
      type: "retail",
      customerId: customers[0].id,
      daysAgo: 17,
      items: [{ productId: products[3].id }],
      paid: 0.4,
    },
    {
      type: "retail",
      customerId: customers[1].id,
      daysAgo: 20,
      items: [{ productId: products[6].id }],
      paid: 1,
    },
    {
      type: "wholesale",
      customerId: customers[6].id,
      daysAgo: 24,
      items: [{ productId: products[5].id }],
      paid: 1,
    },
    {
      type: "retail",
      customerId: customers[3].id,
      daysAgo: 27,
      items: [{ productId: products[8].id }],
      paid: 0.5,
    },
  ];

  let counter = 0;
  for (const def of invoiceDefs) {
    const items = def.items.map((it) => {
      const p = products.find((x) => x.id === it.productId)!;
      return {
        productId: p.id,
        weightGrams: parseFloat(p.weightGrams),
        ratePerGram: parseFloat(p.ratePerGram),
        makingChargePercent: parseFloat(p.makingChargePercent),
        stoneCharges: parseFloat(p.stoneCharges),
        gstRate: parseFloat(p.gstRate),
      };
    });
    const totals = computeInvoiceTotals(items, def.discount ?? 0);
    const prefix = def.type === "wholesale" ? "WS" : "RT";
    const invoiceNumber = nextSerial(prefix, counter++);
    const date = new Date(today);
    date.setDate(today.getDate() - def.daysAgo);
    const paidAmount = totals.total * (def.paid ?? 1);
    const [inv] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber,
        type: def.type,
        customerId: def.customerId,
        date,
        subtotal: totals.subtotal.toFixed(2),
        gstAmount: totals.gstAmount.toFixed(2),
        discount: (def.discount ?? 0).toFixed(2),
        total: totals.total.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
      })
      .returning();
    await db.insert(invoiceItemsTable).values(
      def.items.map((it) => {
        const p = products.find((x) => x.id === it.productId)!;
        const c = computeItem({
          weightGrams: parseFloat(p.weightGrams),
          ratePerGram: parseFloat(p.ratePerGram),
          makingChargePercent: parseFloat(p.makingChargePercent),
          stoneCharges: parseFloat(p.stoneCharges),
          gstRate: parseFloat(p.gstRate),
        });
        return {
          invoiceId: inv.id,
          productId: p.id,
          productName: p.name,
          metal: p.metal,
          purity: p.purity,
          weightGrams: p.weightGrams,
          ratePerGram: p.ratePerGram,
          makingChargePercent: p.makingChargePercent,
          stoneCharges: p.stoneCharges,
          gstRate: p.gstRate,
          amount: c.amount.toFixed(2),
          hsnCode: p.hsnCode,
        };
      }),
    );
  }

  // Girvi loans
  const girviDefs: Array<{
    customerId: string;
    daysAgo: number;
    dueInDays: number;
    metal: "gold" | "silver";
    purity: string;
    weight: number;
    amount: number;
    rate: number;
    item: string;
    status?: "active" | "closed";
    paid?: number;
  }> = [
    {
      customerId: customers[2].id,
      daysAgo: 90,
      dueInDays: 90,
      metal: "gold",
      purity: "22K",
      weight: 32.5,
      amount: 175000,
      rate: 1.5,
      item: "Gold haar (necklace) — 32.5g 22K",
    },
    {
      customerId: customers[3].id,
      daysAgo: 220,
      dueInDays: 0,
      metal: "gold",
      purity: "22K",
      weight: 18.2,
      amount: 95000,
      rate: 2,
      item: "Gold bangles pair — 18.2g 22K",
    },
    {
      customerId: customers[5].id,
      daysAgo: 45,
      dueInDays: 135,
      metal: "gold",
      purity: "18K",
      weight: 22.0,
      amount: 105000,
      rate: 1.75,
      item: "Gold ring set — 22g 18K",
    },
    {
      customerId: customers[4].id,
      daysAgo: 12,
      dueInDays: 168,
      metal: "silver",
      purity: "925",
      weight: 380.0,
      amount: 28000,
      rate: 1.5,
      item: "Silver tray + glasses — 380g",
    },
    {
      customerId: customers[1].id,
      daysAgo: 300,
      dueInDays: -120,
      metal: "gold",
      purity: "22K",
      weight: 14.4,
      amount: 72000,
      rate: 2,
      status: "closed",
      paid: 90000,
      item: "Gold chain — 14.4g 22K",
    },
  ];

  let girviCounter = 0;
  for (const def of girviDefs) {
    const loanDate = new Date(today);
    loanDate.setDate(today.getDate() - def.daysAgo);
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + def.dueInDays);
    const loanNumber = nextSerial("GR", girviCounter++);
    const [loan] = await db
      .insert(girviLoansTable)
      .values({
        loanNumber,
        customerId: def.customerId,
        itemDescription: def.item,
        metal: def.metal,
        purity: def.purity,
        weightGrams: def.weight.toFixed(3),
        loanAmount: def.amount.toFixed(2),
        interestRatePct: def.rate.toFixed(2),
        loanDate,
        dueDate,
        status: def.status ?? "active",
        closedAt: def.status === "closed" ? new Date() : null,
      })
      .returning();
    if (def.paid && def.paid > 0) {
      await db.insert(girviPaymentsTable).values({
        loanId: loan.id,
        amount: def.paid.toFixed(2),
        note: def.status === "closed" ? "Loan closed in full" : "Partial payment",
      });
    }
  }

  // Ledger entries
  await db.insert(ledgerEntriesTable).values([
    {
      customerId: customers[0].id,
      type: "debit",
      amount: "12500",
      description: "Repair charges — diamond ring",
      reference: "JC-1183",
      date: new Date(today.getTime() - 9 * 86400000),
    },
    {
      customerId: customers[2].id,
      type: "credit",
      amount: "5000",
      description: "Advance towards custom mangalsutra",
      reference: "ADV-441",
      date: new Date(today.getTime() - 4 * 86400000),
    },
    {
      customerId: customers[6].id,
      type: "debit",
      amount: "85000",
      description: "Wholesale purchase — silver bars",
      reference: "WS-PUR-22",
      date: new Date(today.getTime() - 18 * 86400000),
    },
    {
      customerId: customers[7].id,
      type: "credit",
      amount: "120000",
      description: "Settlement against last month dues",
      reference: "STL-9",
      date: new Date(today.getTime() - 6 * 86400000),
    },
    {
      customerId: customers[4].id,
      type: "debit",
      amount: "3500",
      description: "Gold polishing",
      reference: "POL-77",
      date: new Date(today.getTime() - 2 * 86400000),
    },
  ]);

  // ===== Shop settings =====
  await db.insert(shopSettingsTable).values({
    id: 1,
    shopName: "Jewel Suite",
    tagline: "Premium Jewellers • Established 1972",
    address: "12, Pedder Road",
    city: "Mumbai 400026",
    phone: "+91 22 2345 6789",
    email: "hello@jewelsuite.in",
    gstin: "27AABCJ1234F1Z9",
    pan: "AABCJ1234F",
    upiId: "jewelsuite@hdfcbank",
    bankName: "HDFC Bank",
    bankAccount: "50100123456789",
    bankIfsc: "HDFC0000123",
    invoiceTerms:
      "• Hallmarked metal as per BIS standards.\n• Goods once sold can be exchanged within 30 days.\n• All disputes subject to Mumbai jurisdiction only.",
  });

  // ===== Karigars =====
  const karigars = await db
    .insert(karigarsTable)
    .values([
      { name: "Ramesh Kumawat", phone: "+91 98765 11223", speciality: "Necklaces, kundan", address: "Zaveri Bazaar, Mumbai" },
      { name: "Suresh Soni", phone: "+91 99887 33445", speciality: "Bangles, polishing", address: "Ghatkopar, Mumbai" },
      { name: "Vikram Jadhav", phone: "+91 90091 77882", speciality: "Repairs, soldering", address: "Dadar, Mumbai" },
    ])
    .returning();

  let karigarJobCounter = 0;
  await db.insert(karigarJobsTable).values([
    {
      jobNumber: nextSerial("JOB", karigarJobCounter++),
      karigarId: karigars[0].id,
      itemDescription: "22K bridal necklace set",
      metal: "gold",
      purity: "22K",
      issuedWeight: "85.500",
      expectedWastagePct: "2.50",
      laborCharge: "8500",
      issuedDate: new Date(today.getTime() - 12 * 86400000),
      expectedDate: new Date(today.getTime() + 8 * 86400000),
      status: "issued",
    },
    {
      jobNumber: nextSerial("JOB", karigarJobCounter++),
      karigarId: karigars[1].id,
      itemDescription: "22K thick kada bangle",
      metal: "gold",
      purity: "22K",
      issuedWeight: "42.300",
      receivedWeight: "41.150",
      expectedWastagePct: "3.00",
      laborCharge: "3200",
      issuedDate: new Date(today.getTime() - 25 * 86400000),
      receivedDate: new Date(today.getTime() - 4 * 86400000),
      status: "received",
    },
    {
      jobNumber: nextSerial("JOB", karigarJobCounter++),
      karigarId: karigars[0].id,
      itemDescription: "Antique jhumka pair",
      metal: "gold",
      purity: "22K",
      issuedWeight: "18.750",
      expectedWastagePct: "2.00",
      laborCharge: "2500",
      issuedDate: new Date(today.getTime() - 5 * 86400000),
      expectedDate: new Date(today.getTime() + 10 * 86400000),
      status: "issued",
    },
  ]);

  // ===== Repair tickets =====
  let repairCounter = 0;
  await db.insert(repairJobsTable).values([
    {
      ticketNumber: nextSerial("REP", repairCounter++),
      customerId: customers[1].id,
      itemDescription: "Diamond ring — broken claw",
      metal: "gold",
      purity: "18K",
      weightGrams: "5.250",
      issue: "One prong of solitaire is bent and stone is loose.",
      estimatedCost: "1800",
      receivedDate: new Date(today.getTime() - 6 * 86400000),
      promisedDate: new Date(today.getTime() + 4 * 86400000),
      status: "in_progress",
    },
    {
      ticketNumber: nextSerial("REP", repairCounter++),
      customerId: customers[3].id,
      itemDescription: "22K chain — lock broken",
      metal: "gold",
      purity: "22K",
      weightGrams: "12.800",
      issue: "Replace lock and polish entire chain.",
      estimatedCost: "950",
      receivedDate: new Date(today.getTime() - 2 * 86400000),
      promisedDate: new Date(today.getTime() + 5 * 86400000),
      status: "received",
    },
    {
      ticketNumber: nextSerial("REP", repairCounter++),
      customerId: customers[0].id,
      itemDescription: "Silver anklet pair — re-sizing",
      metal: "silver",
      purity: "92.5",
      weightGrams: "62.300",
      issue: "Reduce size by 2cm and polish.",
      estimatedCost: "650",
      receivedDate: new Date(today.getTime() - 14 * 86400000),
      deliveredDate: new Date(today.getTime() - 3 * 86400000),
      finalCost: "650",
      paidAmount: "650",
      status: "delivered",
    },
  ]);

  // ===== Saving scheme plans =====
  const plans = await db
    .insert(schemePlansTable)
    .values([
      { name: "11+1 Gold Saver", monthlyAmount: "5000", durationMonths: 11, bonusMonths: 1, description: "Pay 11 monthly installments, redeem 12 months worth of jewellery.", active: "true" },
      { name: "12+1 Silver Saver", monthlyAmount: "2000", durationMonths: 12, bonusMonths: 1, description: "Yearlong silver scheme with one month bonus on maturity.", active: "true" },
      { name: "Festive Diamond Plan", monthlyAmount: "10000", durationMonths: 10, bonusMonths: 1, description: "10-month plan towards diamond jewellery for the festive season.", active: "true" },
    ])
    .returning();

  // ===== Scheme accounts (one in progress, one matured) =====
  let schemeCounter = 0;
  const schemeAccs = await db
    .insert(schemeAccountsTable)
    .values([
      {
        accountNumber: nextSerial("SCH", schemeCounter++),
        planId: plans[0].id,
        customerId: customers[2].id,
        startDate: new Date(today.getTime() - 5 * 30 * 86400000),
        status: "active",
      },
      {
        accountNumber: nextSerial("SCH", schemeCounter++),
        planId: plans[1].id,
        customerId: customers[4].id,
        startDate: new Date(today.getTime() - 11 * 30 * 86400000),
        status: "active",
      },
    ])
    .returning();

  // 5 installments paid on the first account
  for (let i = 0; i < 5; i++) {
    await db.insert(schemeInstallmentsTable).values({
      accountId: schemeAccs[0].id,
      installmentNumber: i + 1,
      paidAmount: "5000",
      paidAt: new Date(today.getTime() - (5 - i) * 30 * 86400000),
      note: i === 0 ? "Opening installment" : null,
    });
  }
  // 10 installments on the second account (close to maturing)
  for (let i = 0; i < 10; i++) {
    await db.insert(schemeInstallmentsTable).values({
      accountId: schemeAccs[1].id,
      installmentNumber: i + 1,
      paidAmount: "2000",
      paidAt: new Date(today.getTime() - (10 - i) * 30 * 86400000),
    });
  }

  // ===== Estimates =====
  let estimateCounter = 0;
  const estDef = {
    productId: products[0].id,
    productName: products[0].name,
    metal: products[0].metal,
    purity: products[0].purity,
    weightGrams: 22,
    ratePerGram: 7100,
    makingChargePercent: 12,
    stoneCharges: 0,
    gstRate: 3,
  };
  const estBase = estDef.weightGrams * estDef.ratePerGram;
  const estMaking = estBase * (estDef.makingChargePercent / 100);
  const estTaxable = estBase + estMaking;
  const estGst = estTaxable * (estDef.gstRate / 100);
  const [estimate] = await db
    .insert(estimatesTable)
    .values({
      estimateNumber: nextSerial("EST", estimateCounter++),
      customerId: customers[5].id,
      date: new Date(today.getTime() - 2 * 86400000),
      validUntil: new Date(today.getTime() + 5 * 86400000),
      subtotal: estTaxable.toFixed(2),
      gstAmount: estGst.toFixed(2),
      discount: "0",
      total: (estTaxable + estGst).toFixed(2),
      status: "sent",
      notes: "Sent over WhatsApp; awaiting customer confirmation.",
    })
    .returning();
  await db.insert(estimateItemsTable).values({
    estimateId: estimate.id,
    productId: estDef.productId,
    productName: estDef.productName,
    metal: estDef.metal,
    purity: estDef.purity,
    weightGrams: estDef.weightGrams.toFixed(3),
    ratePerGram: estDef.ratePerGram.toFixed(2),
    makingChargePercent: estDef.makingChargePercent.toFixed(2),
    stoneCharges: estDef.stoneCharges.toFixed(2),
    gstRate: estDef.gstRate.toFixed(2),
    amount: (estTaxable + estGst).toFixed(2),
  });

  console.log("Seeded:", {
    customers: customers.length,
    products: products.length,
    invoices: invoiceDefs.length,
    girvi: girviDefs.length,
    karigars: karigars.length,
    plans: plans.length,
    schemeAccounts: schemeAccs.length,
  });
  void sql;
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
