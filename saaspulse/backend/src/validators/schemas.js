const { z } = require('zod');
const { isValidObjectId } = require('mongoose');
const { parseDate } = require('../utils/dates');

const objectId = z.string().refine(isValidObjectId, 'Must be a valid id');
const dateString = z
  .string()
  .refine((s) => parseDate(s) !== null, 'Must be a valid date (YYYY-MM-DD)')
  .transform((s) => parseDate(s))
  .refine((d) => d <= new Date(Date.now() + 24 * 3600 * 1000), 'Date cannot be in the future');

const idParams = z.object({ id: objectId });

// ── Customers ──────────────────────────────────────────
const SORTABLE = ['name', 'email', 'company', 'mrr', 'signupDate', 'churnDate', 'status'];

const listCustomersQuery = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: z.enum(['all', 'active', 'churned']).optional().default('all'),
  plan: z.union([z.literal('all'), objectId]).optional().default('all'),
  sort: z
    .string()
    .optional()
    .default('-signupDate')
    .refine((s) => SORTABLE.includes(s.replace(/^-/, '')), `Sort must be one of: ${SORTABLE.join(', ')}`),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createCustomerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  company: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  planId: objectId,
  signupDate: dateString.optional(),
  notes: z.string().trim().max(2000).optional().default(''),
});

const updateCustomerBody = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
    company: z.string().trim().max(120),
    city: z.string().trim().max(80),
    planId: objectId,
    notes: z.string().trim().max(2000),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

const updateStatusBody = z.object({
  status: z.enum(['active', 'churned']),
  reason: z.string().trim().max(200).optional().default(''),
});

// ── Plans ──────────────────────────────────────────────
const createPlanBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(40),
  monthlyPrice: z.coerce.number().positive('Price must be greater than 0').max(10_000_000),
  description: z.string().trim().max(200).optional().default(''),
});

const updatePlanBody = z
  .object({
    name: z.string().trim().min(2).max(40),
    monthlyPrice: z.coerce.number().positive().max(10_000_000),
    description: z.string().trim().max(200),
    isArchived: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

// ── Metrics / activity / import ────────────────────────
const overviewQuery = z.object({
  months: z.coerce.number().int().refine((n) => [3, 6, 12, 24].includes(n), 'months must be 3, 6, 12 or 24').optional().default(12),
});

const activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(15),
});

const importQuery = z.object({
  dryRun: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

module.exports = {
  idParams,
  listCustomersQuery,
  createCustomerBody,
  updateCustomerBody,
  updateStatusBody,
  createPlanBody,
  updatePlanBody,
  overviewQuery,
  activityQuery,
  importQuery,
};
