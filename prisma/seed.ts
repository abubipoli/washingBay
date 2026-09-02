import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "First Class Washing Bay",
      currency: process.env.DEFAULT_CURRENCY ?? "GHS",
    },
  });

  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@firstclass.local";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: "Owner",
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      role: "OWNER",
    },
  });
  console.log(`Owner account ready: ${ownerEmail} / ${ownerPassword} (change this password after first login)`);

  // Only two services: "Washing" splits evenly three ways by default (as
  // originally specified — one third each to business/boy/soap); "Others"
  // has no default split at all, since that split is meant to always be
  // typed in by hand for whatever one-off job it covers.
  const serviceTypes = [
    { name: "Washing", defaultPrice: 30, defaultBusinessPct: 33.34, defaultStaffPct: 33.33, defaultSoapPct: 33.33 },
    { name: "Others", defaultPrice: 0, defaultBusinessPct: 0, defaultStaffPct: 0, defaultSoapPct: 0 },
  ];
  for (const st of serviceTypes) {
    await prisma.serviceType.upsert({ where: { name: st.name }, update: {}, create: st });
  }
  // If this database was seeded before with the old, larger service catalog,
  // retire those entries rather than deleting them — existing wash records
  // still reference them by id, so deleting would orphan history. They just
  // stop showing up as choices for new washes.
  await prisma.serviceType.updateMany({
    where: { name: { notIn: serviceTypes.map((s) => s.name) } },
    data: { active: false },
  });

  const staffSeed = [
    { name: "Kwame A.", phone: "+233201111111" },
    { name: "Emmanuel", phone: "+233202222222" },
    { name: "Daniel T.", phone: "+233203333333" },
  ];
  for (const s of staffSeed) {
    await prisma.staff.upsert({ where: { phone: s.phone }, update: {}, create: s });
  }

  console.log("Seed complete.");
  void owner;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
