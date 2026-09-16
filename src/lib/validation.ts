import { z } from "zod";
import { roundMoney } from "./money";

const money = z.coerce.number().finite().nonnegative();

export const createWashSchema = z
  .object({
    vehiclePlate: z.string().trim().min(2, "Vehicle number is required").max(20),
    vehicleMake: z.string().trim().max(60).optional().or(z.literal("")),
    // Lets a manager backdate a job entered late (e.g. recorded the next
    // morning) instead of it always landing under today. Optional — omitting
    // it falls back to the server's own `now()` at creation time.
    date: z
      .coerce.date()
      .refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, "Date can't be in the future")
      .optional(),
    vehicleType: z.enum(["CAR", "SUV", "TRUCK", "BUS", "MOTORBIKE", "VAN", "CAMBOO", "MOTORKING", "OTHER"]),
    serviceTypeId: z.string().cuid().optional().nullable(),
    serviceLabel: z.string().trim().min(2, "Service name is required").max(80),
    staffId: z.string().cuid("Select the washing boy who did the job"),
    totalAmount: money,
    amountBusiness: money,
    amountStaff: money,
    amountSoap: money,
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    customerName: z.string().trim().max(80).optional().or(z.literal("")),
    customerPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number, e.g. +233201234567")
      .optional()
      .or(z.literal("")),
    notifyCustomer: z.boolean().optional(),
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
  status: z.enum(["QUEUED", "WASHING", "COMPLETED", "CANCELLED"]),
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

export const createExpenseSchema = z.object({
  category: z.enum([
    "ELECTRICITY",
    "WATER",
    "SOAP_CHEMICALS",
    "MAINTENANCE",
    "SALARY",
    "RENT",
    "FOOD",
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

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "MANAGER"]),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["OWNER", "MANAGER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
