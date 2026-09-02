import { z } from "zod";
import { roundMoney } from "./money";

const money = z.coerce.number().finite().nonnegative();

export const createWashSchema = z
  .object({
    vehiclePlate: z.string().trim().min(2, "Vehicle number is required").max(20),
    vehicleMake: z.string().trim().max(60).optional().or(z.literal("")),
    vehicleType: z.enum(["CAR", "SUV", "TRUCK", "BUS", "MOTORBIKE", "VAN", "OTHER"]),
    serviceTypeId: z.string().cuid().optional().nullable(),
    serviceLabel: z.string().trim().min(2, "Service name is required").max(80),
    staffId: z.string().cuid("Select the washing boy who did the job"),
    totalAmount: money,
    amountBusiness: money,
    amountStaff: money,
    amountSoap: money,
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      roundMoney(data.amountBusiness + data.amountStaff + data.amountSoap) ===
      roundMoney(data.totalAmount),
    {
      message: "Business + Boy + Soap must add up to the total amount",
      path: ["amountBusiness"],
    }
  );

export type CreateWashInput = z.infer<typeof createWashSchema>;

export const updateWashStatusSchema = z.object({
  status: z.enum(["QUEUED", "WASHING", "DETAILING", "COMPLETED", "CANCELLED"]),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number, e.g. +233201234567"),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number, e.g. +233201234567"),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createServiceTypeSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    defaultPrice: money,
    // Decimal, not integer: an even three-way split is 33.33...%, which a
    // whole-number percent can't represent without losing a cent on totals
    // not divisible by 3. See prisma/schema.prisma for the same note.
    defaultBusinessPct: z.coerce.number().min(0).max(100),
    defaultStaffPct: z.coerce.number().min(0).max(100),
    defaultSoapPct: z.coerce.number().min(0).max(100),
  })
  .refine(
    (d) => {
      const sum = d.defaultBusinessPct + d.defaultStaffPct + d.defaultSoapPct;
      return Math.abs(sum - 100) < 0.01;
    },
    { message: "Split percentages must add up to 100", path: ["defaultBusinessPct"] }
  );

export const createExpenseSchema = z.object({
  category: z.enum([
    "ELECTRICITY",
    "WATER",
    "SOAP_CHEMICALS",
    "MAINTENANCE",
    "SALARY",
    "RENT",
    "OTHER",
  ]),
  amount: money.positive("Amount must be greater than zero"),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  date: z.coerce.date().optional(),
});

export const createPayoutSchema = z.object({
  staffId: z.string().cuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notify: z.enum(["SMS", "RECEIPT_PRINT", "NONE"]).default("NONE"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
