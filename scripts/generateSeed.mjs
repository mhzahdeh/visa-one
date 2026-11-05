// generateSeed.mjs — deterministic generator for the Visa One seed data.
// Run with: node scripts/generateSeed.mjs
// Produces src/data/seed.json. All data is fictional.
//
// Targets (from the brief):
//   - ~60 days of transactions ending Wed 4 Nov 2026 (DEMO_TODAY).
//   - Usual daily spend ~= £19 (GBP) and ~= €1 (EUR, used rarely).
//   - Specific items: £12.99 sub renews Thu 5 Nov, £11.00 streaming renews Fri 6 Nov,
//     £34 beauty on Sat 31 Oct (user will mark "Not my pattern"),
//     €9.99 music subscription renews Sun 15 Nov.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_TODAY = new Date("2026-11-04T00:00:00");
const DAYS = 60;

// Small seeded PRNG (mulberry32) for repeatable output.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261104);

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function money(n) {
  return Math.round(n * 100) / 100;
}

const CARDS = {
  northbank: "card-northbank",
  riverside: "card-riverside",
  solano: "card-solano",
};

const txns = [];
let seq = 0;
function add(t) {
  txns.push({ id: `t${String(++seq).padStart(3, "0")}`, ...t });
}

// ---- GBP everyday spend: aim ~£19/day averaged across the window ----
// We split GBP between the Northbank debit (most spend) and Riverside credit (some).
const gbpMerchants = {
  Takeaways: ["Munchies", "Noodle Box", "Burger Yard", "Pizza Loop"],
  Groceries: ["Freshmart", "Corner Co-op", "GreenGrocer", "DailyMart"],
  Transport: ["City Transit", "RideNow", "Metro Fare", "BusGo"],
  Clothes: ["ThreadHouse", "Denim Dept", "Sole Street"],
  "Eating out": ["Bean Scene", "The Nook Café", "Brew & Co"],
};

// For each of the 60 days, create a realistic mix landing near the £19/day target.
for (let i = DAYS; i >= 1; i--) {
  const d = addDays(DEMO_TODAY, -i);
  const day = iso(d);
  const dow = d.getDay(); // 0 Sun .. 6 Sat

  // Base daily GBP budget with mild weekday/weekend variation, centred to average ~19.
  let dayTotalTarget = 17.3;
  if (dow === 0 || dow === 6) dayTotalTarget += 5; // weekends up
  if (dow === 2 || dow === 3) dayTotalTarget -= 4; // quieter midweek
  dayTotalTarget += (rand() - 0.5) * 7;

  let remaining = Math.max(4, dayTotalTarget);

  // Groceries a few times a week.
  if (rand() < 0.5 && remaining > 6) {
    const amt = money(5 + rand() * 12);
    remaining -= amt;
    add({
      cardId: CARDS.northbank,
      date: day,
      merchant: pick(gbpMerchants.Groceries),
      category: "Groceries",
      amount: amt,
      currency: "GBP",
    });
  }
  // Transport most weekdays.
  if (dow >= 1 && dow <= 5 && rand() < 0.75 && remaining > 2) {
    const amt = money(1.8 + rand() * 3.5);
    remaining -= amt;
    add({
      cardId: CARDS.northbank,
      date: day,
      merchant: pick(gbpMerchants.Transport),
      category: "Transport",
      amount: amt,
      currency: "GBP",
    });
  }
  // Takeaways: a frequent habit (brief: habits show 8 takeaways in last 4 weeks, trending up).
  if (rand() < 0.45 && remaining > 6) {
    const amt = money(6 + rand() * 9);
    remaining -= amt;
    add({
      cardId: rand() < 0.6 ? CARDS.northbank : CARDS.riverside,
      date: day,
      merchant: pick(gbpMerchants.Takeaways),
      category: "Takeaways",
      amount: amt,
      currency: "GBP",
    });
  }
  // Eating out occasionally.
  if (rand() < 0.3 && remaining > 4) {
    const amt = money(3 + rand() * 7);
    remaining -= amt;
    add({
      cardId: CARDS.northbank,
      date: day,
      merchant: pick(gbpMerchants["Eating out"]),
      category: "Eating out",
      amount: amt,
      currency: "GBP",
    });
  }
  // Clothes rarely, on the credit card.
  if (rand() < 0.08 && remaining > 10) {
    const amt = money(12 + rand() * 25);
    remaining -= amt;
    add({
      cardId: CARDS.riverside,
      date: day,
      merchant: pick(gbpMerchants.Clothes),
      category: "Clothes",
      amount: amt,
      currency: "GBP",
    });
  }
  // Soak up leftover with a small "Other" so the daily average stays near target.
  if (remaining > 3) {
    add({
      cardId: CARDS.northbank,
      date: day,
      merchant: pick(["Kiosk", "Market Stall", "Vending", "Local Shop"]),
      category: "Other",
      amount: money(remaining),
      currency: "GBP",
    });
  }
}

// ---- EUR: used rarely, ~€1/day average over the window ----
// A handful of small cafe/transport payments on the Banco Solano card.
const eurDays = [55, 44, 33, 22, 14, 7, 3];
for (const back of eurDays) {
  const d = addDays(DEMO_TODAY, -back);
  add({
    cardId: CARDS.solano,
    date: iso(d),
    merchant: pick(["Café Central", "Metro Madrid", "Panadería Sol", "Tapas 12"]),
    category: pick(["Eating out", "Transport", "Groceries"]),
    amount: money(4 + rand() * 6),
    currency: "EUR",
  });
}
// €9.99 music subscription charged once within the window (its next renewal is Sun 15 Nov).
add({
  cardId: CARDS.solano,
  date: iso(addDays(DEMO_TODAY, -30)),
  merchant: "SonidoMusic",
  category: "Subscriptions",
  amount: 9.99,
  currency: "EUR",
  subscription: true,
});

// ---- Named recurring subscription charges already seen in-window (GBP) ----
add({
  cardId: CARDS.northbank,
  date: iso(addDays(DEMO_TODAY, -31)),
  merchant: "CloudStore+",
  category: "Subscriptions",
  amount: 12.99,
  currency: "GBP",
  subscription: true,
});
add({
  cardId: CARDS.northbank,
  date: iso(addDays(DEMO_TODAY, -29)),
  merchant: "StreamFlix",
  category: "Subscriptions",
  amount: 11.0,
  currency: "GBP",
  subscription: true,
});

// ---- The £34 beauty purchase on Sat 31 Oct 2026 (user marks "Not my pattern") ----
add({
  cardId: CARDS.riverside,
  date: "2026-10-31",
  merchant: "GlowRoom",
  category: "Beauty",
  amount: 34.0,
  currency: "GBP",
});

// Sort by date ascending for stable output.
txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

const seed = {
  generatedFrom: "scripts/generateSeed.mjs",
  demoToday: iso(DEMO_TODAY),
  cards: [
    {
      id: CARDS.northbank,
      nickname: "Northbank",
      bank: "Northbank",
      country: "UK",
      currency: "GBP",
      last4: "4821",
      type: "debit",
      connected: true,
      includedInTotals: true,
    },
    {
      id: CARDS.riverside,
      nickname: "Riverside",
      bank: "Riverside",
      country: "UK",
      currency: "GBP",
      last4: "1307",
      type: "credit",
      connected: true,
      includedInTotals: true,
    },
    {
      id: CARDS.solano,
      nickname: "Banco Solano",
      bank: "Banco Solano",
      country: "ES",
      currency: "EUR",
      last4: "5590",
      type: "debit",
      connected: true,
      includedInTotals: true,
    },
  ],
  // Cards available to add later (Visa cards the banks have enrolled but not connected yet).
  availableCards: [
    {
      id: "card-northbank-savings",
      nickname: "Northbank Rewards",
      bank: "Northbank",
      country: "UK",
      currency: "GBP",
      last4: "9044",
      type: "credit",
      connected: false,
      includedInTotals: true,
    },
    {
      id: "card-solano-2",
      nickname: "Banco Solano Travel",
      bank: "Banco Solano",
      country: "ES",
      currency: "EUR",
      last4: "7781",
      type: "debit",
      connected: false,
      includedInTotals: true,
    },
  ],
  transactions: txns,
  upcoming: [
    {
      id: "u1",
      merchant: "CloudStore+",
      category: "Subscriptions",
      amount: 12.99,
      currency: "GBP",
      renewsOn: "2026-11-05", // Thu 5 Nov
      cardId: CARDS.northbank,
    },
    {
      id: "u2",
      merchant: "StreamFlix",
      category: "Subscriptions",
      amount: 11.0,
      currency: "GBP",
      renewsOn: "2026-11-06", // Fri 6 Nov
      cardId: CARDS.northbank,
    },
    {
      id: "u3",
      merchant: "SonidoMusic",
      category: "Subscriptions",
      amount: 9.99,
      currency: "EUR",
      renewsOn: "2026-11-15", // Sun 15 Nov
      cardId: CARDS.solano,
    },
  ],
  // Default paydays (brief demo values).
  paydays: [
    {
      id: "p1",
      name: "Café job",
      nextDate: "2026-11-13", // Fri 13 Nov
      frequency: "monthly",
      amount: 420,
      currency: "GBP",
    },
    {
      id: "p2",
      name: "Allowance from home",
      nextDate: "2026-12-01", // Tue 1 Dec
      frequency: "monthly",
      amount: 150,
      currency: "EUR",
    },
  ],
  moneyUntilPayday: { GBP: 155, EUR: 60 },
};

// Report the computed daily averages so we can sanity check against the targets.
function windowAverage(currency) {
  const start = iso(addDays(DEMO_TODAY, -DAYS));
  const end = iso(DEMO_TODAY);
  const inWindow = txns.filter(
    (t) => t.currency === currency && t.date >= start && t.date < end && !t.subscription
  );
  const total = inWindow.reduce((s, t) => s + t.amount, 0);
  return total / DAYS;
}

mkdirSync(dirname(`${__dirname}/../src/data/seed.json`), { recursive: true });
writeFileSync(
  `${__dirname}/../src/data/seed.json`,
  JSON.stringify(seed, null, 2) + "\n"
);

console.log("Seed written. Transactions:", txns.length);
console.log("Avg GBP/day (ex-subs):", windowAverage("GBP").toFixed(2));
console.log("Avg EUR/day (ex-subs):", windowAverage("EUR").toFixed(2));
