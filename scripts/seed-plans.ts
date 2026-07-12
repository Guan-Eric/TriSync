#!/usr/bin/env npx ts-node
/**
 * Seeds the 8 curated plans into Firestore.
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npx ts-node scripts/seed-plans.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PLAN_CATALOG } from '../content/plans/catalog';

async function main() {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  for (const plan of PLAN_CATALOG) {
    await db.doc(`plans/${plan.id}`).set(plan, { merge: true });
    console.log('Seeded', plan.id);
  }
  console.log(`Done — ${PLAN_CATALOG.length} plans`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
