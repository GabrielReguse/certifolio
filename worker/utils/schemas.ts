import { z } from 'zod';

function isRealDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const dateValue = z.string().refine(isRealDate, 'Use uma data válida no formato AAAA-MM-DD.');
const optionalDateCreate = z.union([dateValue, z.literal(''), z.null()]).optional();
const optionalDatePatch = z.union([dateValue, z.literal(''), z.null()]).optional();

const httpUrl = z.string().trim().max(2048).superRefine((value, ctx) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      ctx.addIssue({ code: 'custom', message: 'Use um endereço iniciado por http:// ou https://.' });
    }
    if (parsed.username || parsed.password) {
      ctx.addIssue({ code: 'custom', message: 'O endereço não pode conter usuário ou senha.' });
    }
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Informe um endereço válido.' });
  }
});

const optionalUrlCreate = z.union([httpUrl, z.literal('')]).optional();
const optionalUrlPatch = z.union([httpUrl, z.literal('')]).optional();

const courseStatus = z.enum(['planned', 'in_progress', 'completed', 'abandoned', 'expired']);
const courseVisibility = z.enum(['private', 'public', 'unlisted']);
const certificateVisibility = z.enum(['private', 'public', 'redacted']);

const courseFields = {
  title: z.string().trim().min(2).max(160),
  institutionName: z.string().trim().min(2).max(120),
  institutionWebsite: optionalUrlCreate,
  platformName: z.string().trim().max(120),
  description: z.string().trim().max(3000),
  category: z.string().trim().min(2).max(80),
  status: courseStatus,
  hoursMinutes: z.number().int().min(0).max(600000),
  startDate: optionalDateCreate,
  endDate: optionalDateCreate,
  issuedAt: optionalDateCreate,
  expiresAt: optionalDateCreate,
  rating: z.number().int().min(0).max(10),
  credentialId: z.string().trim().max(180),
  verificationUrl: optionalUrlCreate,
  visibility: courseVisibility,
  certificateVisibility,
  isFeatured: z.boolean(),
  notes: z.string().trim().max(5000),
  skills: z.array(z.string().trim().min(1).max(60)).max(30),
};

function validateCourseDates(
  data: Partial<{ startDate: string | null; endDate: string | null; issuedAt: string | null; expiresAt: string | null }>,
  ctx: z.RefinementCtx,
) {
  const clean = (value: string | null | undefined) => value || undefined;
  const startDate = clean(data.startDate);
  const endDate = clean(data.endDate);
  const issuedAt = clean(data.issuedAt);
  const expiresAt = clean(data.expiresAt);

  if (startDate && endDate && startDate > endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'A data de término não pode ser anterior à data de início.' });
  }
  if (issuedAt && expiresAt && issuedAt > expiresAt) {
    ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'A expiração não pode ser anterior à emissão.' });
  }
}

export const courseInputSchema = z.object({
  ...courseFields,
  platformName: courseFields.platformName.optional().default(''),
  description: courseFields.description.optional().default(''),
  category: courseFields.category.optional().default('Outros'),
  status: courseFields.status.optional().default('completed'),
  rating: courseFields.rating.optional().default(0),
  credentialId: courseFields.credentialId.optional().default(''),
  visibility: courseFields.visibility.optional().default('private'),
  certificateVisibility: courseFields.certificateVisibility.optional().default('private'),
  isFeatured: courseFields.isFeatured.optional().default(false),
  notes: courseFields.notes.optional().default(''),
  skills: courseFields.skills.optional().default([]),
}).strict().superRefine(validateCourseDates);

export const coursePatchSchema = z.object({
  title: courseFields.title.optional(),
  institutionName: courseFields.institutionName.optional(),
  institutionWebsite: optionalUrlPatch,
  platformName: courseFields.platformName.optional(),
  description: courseFields.description.optional(),
  category: courseFields.category.optional(),
  status: courseFields.status.optional(),
  hoursMinutes: courseFields.hoursMinutes.optional(),
  startDate: optionalDatePatch,
  endDate: optionalDatePatch,
  issuedAt: optionalDatePatch,
  expiresAt: optionalDatePatch,
  rating: courseFields.rating.optional(),
  credentialId: courseFields.credentialId.optional(),
  verificationUrl: optionalUrlPatch,
  visibility: courseFields.visibility.optional(),
  certificateVisibility: courseFields.certificateVisibility.optional(),
  isFeatured: courseFields.isFeatured.optional(),
  notes: courseFields.notes.optional(),
  skills: courseFields.skills.optional(),
}).strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Envie ao menos um campo para atualizar.' });

export const profileInputSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(600).optional().default(''),
  roleTitle: z.string().trim().max(100).optional().default(''),
  location: z.string().trim().max(100).optional().default(''),
  website: optionalUrlCreate,
  profileVisibility: z.enum(['public', 'private']),
  profileLayout: z.enum(['grid', 'timeline', 'resume']),
  publicTheme: z.enum(['light', 'dark', 'system']),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  showRating: z.boolean(),
  showTotalHours: z.boolean(),
  showInstitutions: z.boolean(),
  allowIndexing: z.boolean(),
  onboardingCompleted: z.boolean().optional(),
}).strict();

const goalBaseFields = {
  title: z.string().trim().min(2).max(100),
  metric: z.enum(['hours', 'courses']),
  targetValue: z.number().int().min(1).max(1000000),
  deadline: optionalDateCreate,
  isPinned: z.boolean(),
};

export const goalInputSchema = z.object({
  ...goalBaseFields,
  isPinned: goalBaseFields.isPinned.optional().default(false),
}).strict();

export const goalPatchSchema = z.object({
  title: goalBaseFields.title.optional(),
  metric: goalBaseFields.metric.optional(),
  targetValue: goalBaseFields.targetValue.optional(),
  deadline: optionalDatePatch,
  isPinned: goalBaseFields.isPinned.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'Envie ao menos um campo para atualizar.',
});
