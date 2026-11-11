// Writes mock orders to sample-data/orders.csv.
// Dates are relative to today, so the 14-day return rule always works.
// Run: npm run generate-data

import { writeFileSync } from "node:fs";

const orders = [
  { id: "FL-1001", customer: "Anna Weber", product: "Matte Lipstick 05", brand: "MAC", category: "Makeup", amount: 34.9, deliveredDaysAgo: 3 },
  { id: "FL-1002", customer: "Lukas Schmidt", product: "Eau de Parfum 50ml", brand: "Chanel", category: "Fragrance", amount: 112, deliveredDaysAgo: 2 },
  { id: "FL-1003", customer: "Sara Becker", product: "Hydrating Face Cream", brand: "Clinique", category: "Skincare", amount: 48.5, deliveredDaysAgo: 5 },
  { id: "FL-1004", customer: "Jonas Fischer", product: "Fragrance Gift Set", brand: "Dior", category: "Fragrance", amount: 189, deliveredDaysAgo: 4 },
  { id: "FL-1005", customer: "Mia Hoffmann", product: "Volume Mascara", brand: "Lancome", category: "Makeup", amount: 29.95, deliveredDaysAgo: 30 },
  { id: "FL-1006", customer: "Felix Wagner", product: "Eau de Toilette 100ml", brand: "Hugo Boss", category: "Fragrance", amount: 76, deliveredDaysAgo: 1 },
  { id: "FL-1007", customer: "Lea Schulz", product: "Vitamin C Serum", brand: "The Ordinary", category: "Skincare", amount: 18.9, deliveredDaysAgo: 6 },
  { id: "FL-1008", customer: "Paul Koch", product: "Shampoo Repair 250ml", brand: "Kerastase", category: "Hair", amount: 32.5, deliveredDaysAgo: 7 },
];

// Returns the date N days before today, like "2026-11-08".
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

let csv = "order_id,customer_name,product,brand,category,amount_eur,order_date,delivery_date\n";

for (const o of orders) {
  const orderDate = daysAgo(o.deliveredDaysAgo + 2);
  const deliveryDate = daysAgo(o.deliveredDaysAgo);
  csv += `${o.id},${o.customer},${o.product},${o.brand},${o.category},${o.amount.toFixed(2)},${orderDate},${deliveryDate}\n`;
}

writeFileSync("sample-data/orders.csv", csv);
console.log("Done: sample-data/orders.csv");
