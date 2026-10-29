import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const envPath = [resolve(moduleDir, '../.env'), resolve(moduleDir, '../../.env')].find(existsSync);
if (envPath) dotenv.config({ path: envPath });

const app = express();
const port = Number(process.env.PORT || 4000);
const mongoUrl = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'nxtwave_arena';
const jwtSecret = process.env.JWT_SECRET;
const allowedOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
if (!mongoUrl) console.warn('MONGODB_URI is not configured; API will return a service-unavailable response.');
if (!jwtSecret) console.warn('JWT_SECRET is not configured; admin authentication is disabled.');
let db: ReturnType<MongoClient['db']> | undefined;
async function connectDatabase() {
  if (!mongoUrl) return;
  while (!db) {
    const client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 8000 });
    try {
      await client.connect();
      const database = client.db(dbName);
      await Promise.all([
        database.collection('registrations').createIndex({ emailNormalized: 1 }, { unique: true }),
        database.collection('registrations').createIndex({ referralAmbassadorId: 1, status: 1 }),
        database.collection('colleges').createIndex({ nameNormalized: 1 }, { unique: true }),
        database.collection('ambassadors').createIndex({ emailNormalized: 1 }, { unique: true }),
        database.collection('ambassadors').createIndex({ referralCode: 1 }, { unique: true, sparse: true }),
        database.collection('integration_jobs').createIndex({ status: 1, createdAt: 1 }),
      ]);
      db = database;
      console.log('MongoDB connected.');
    } catch (error) {
      const failure = error as { name?: string; code?: string };
      console.error(`MongoDB connection failed (${failure.code || failure.name || 'unknown'}); retrying in 5 seconds.`);
      await client.close().catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
const api = express.Router();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', api);
const publicLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const adminLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254),
  actualCollegeName: z.string().trim().min(2).max(160), branch: z.string().trim().min(2).max(100),
  academicYear: z.enum(['1st year', '2nd year', '3rd year', '4th year', 'Other']),
  consent: z.literal(true), referralCode: z.string().trim().max(32).optional(),
});
const collegeSchema = z.object({ name: z.string().trim().min(2).max(160), city: z.string().trim().max(100).optional(), state: z.string().trim().max(100).optional() });
const ambassadorSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), collegeId: z.string().min(1) });
function collections() {
  if (!db) throw Object.assign(new Error('Registration service is reconnecting to its database. Please try again shortly.'), { status: 503 });
  return { colleges: db.collection('colleges'), ambassadors: db.collection('ambassadors'), registrations: db.collection('registrations'), jobs: db.collection('integration_jobs'), organizers: db.collection('organizers') };
}
function asyncRoute(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
}
type Role = 'organizer' | 'super_admin';
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!jwtSecret) return res.status(503).json({ message: 'Organizer sign-in is not configured.' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; role: Role };
    if (!['organizer', 'super_admin'].includes(payload.role)) return res.status(403).json({ message: 'Access denied.' });
    res.locals.actor = payload; next();
  } catch { return res.status(401).json({ message: 'Your session has expired. Sign in again.' }); }
}
api.get('/health', (_req, res) => res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'database-unavailable' }));
api.get('/public/colleges', asyncRoute(async (_req, res) => {
  const { colleges } = collections();
  const rows = await colleges.find({ status: 'active' }, { projection: { name: 1, city: 1, state: 1 } }).sort({ name: 1 }).limit(1000).toArray();
  res.json({ colleges: rows });
}));
api.post('/public/registrations', publicLimit, asyncRoute(async (req, res) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the required fields and try again.', fields: parsed.error.issues.map(i => i.path.join('.')) });
  const input = parsed.data;
  const { colleges, ambassadors, registrations, jobs } = collections();
  const college = await colleges.findOne({ nameNormalized: input.actualCollegeName.toLowerCase(), status: 'active' });
  const emailNormalized = input.email.toLowerCase();
  const existing = await registrations.findOne({ emailNormalized }, { projection: { _id: 1 } });
  if (existing) return res.status(409).json({ message: 'This email is already registered. Contact the event team if you need help.' });
  let referralAmbassadorId: ObjectId | null = null;
  let referralCode: string | null = null;
  if (input.referralCode) {
    const ambassador = await ambassadors.findOne({ referralCode: input.referralCode.toUpperCase(), status: 'active' }, { projection: { _id: 1, referralCode: 1 } });
    if (ambassador) { referralAmbassadorId = ambassador._id as ObjectId; referralCode = ambassador.referralCode as string; }
  }
  const now = new Date();
  const registrationId = `NWA-${randomBytes(4).toString('hex').toUpperCase()}`;
  const registration = { registrationId, fullName: input.fullName, emailNormalized, actualCollegeId: college?._id ?? null, actualCollegeName: college?.name ?? input.actualCollegeName, branch: input.branch, academicYear: input.academicYear, referralCode, referralAmbassadorId, status: 'pending', consentVersion: process.env.CONSENT_VERSION || 'v1', consentedAt: now, createdAt: now, updatedAt: now };
  try { await registrations.insertOne(registration); }
  catch (e) { if ((e as { code?: number }).code === 11000) return res.status(409).json({ message: 'This email is already registered. Contact the event team if you need help.' }); throw e; }
  // Durable outbox records let integrations retry without risking a lost registration.
  await jobs.insertMany(['sheets_sync', 'registration_confirmation'].map(jobType => ({ entityType: 'registration', entityId: registrationId, jobType, status: 'queued', attemptCount: 0, createdAt: now, updatedAt: now })));
  res.status(201).json({ registrationId });
}));
api.get('/public/leaderboard', asyncRoute(async (_req, res) => {
  const { registrations, ambassadors, colleges } = collections();
  const rows = await registrations.aggregate([{ $match: { status: 'valid' } }, { $group: { _id: '$actualCollegeId', validRegistrations: { $sum: 1 } } }, { $sort: { validRegistrations: -1, _id: 1 } }, { $limit: 20 }, { $lookup: { from: 'colleges', localField: '_id', foreignField: '_id', as: 'college' } }, { $unwind: '$college' }, { $project: { _id: 0, college: '$college.name', validRegistrations: 1 } }]).toArray();
  const ambRows = await ambassadors.find({ status: 'active', publicDisplayApproved: true }, { projection: { _id: 1, displayName: 1, name: 1, collegeId: 1 } }).toArray();
  const counts = await registrations.aggregate([{ $match: { status: 'valid', referralAmbassadorId: { $ne: null } } }, { $group: { _id: '$referralAmbassadorId', count: { $sum: 1 } } }]).toArray();
  const countById = new Map(counts.map(c => [String(c._id), c.count]));
  const ranks = ambRows.map(a => ({ displayName: a.displayName || a.name, collegeId: a.collegeId, validReferrals: countById.get(String(a._id)) || 0 })).filter(a => a.validReferrals > 0).sort((a, b) => b.validReferrals - a.validReferrals).slice(0, 20);
  const collegeNames = await colleges.find({ _id: { $in: ranks.map(r => r.collegeId) } }, { projection: { name: 1 } }).toArray();
  const nameMap = new Map(collegeNames.map(c => [String(c._id), c.name]));
  res.json({ colleges: rows.map((r, i) => ({ rank: i + 1, ...r })), ambassadors: ranks.map((r, i) => ({ rank: i + 1, displayName: r.displayName, college: nameMap.get(String(r.collegeId)) || 'ï¿½', validReferrals: r.validReferrals })), updatedAt: new Date().toISOString() });
}));
api.post('/admin/setup', adminLimit, asyncRoute(async (req, res) => {
  if (!process.env.ADMIN_SETUP_KEY || req.header('x-setup-key') !== process.env.ADMIN_SETUP_KEY) return res.status(403).json({ message: 'Setup is unavailable.' });
  const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), password: z.string().min(12).max(128) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Provide a valid name, email, and a password of at least 12 characters.' });
  const { organizers } = collections();
  const email = parsed.data.email.toLowerCase();
  if (await organizers.countDocuments() > 0) return res.status(409).json({ message: 'An organizer account has already been initialized.' });
  const user = { name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: 'super_admin' as Role, createdAt: new Date() };
  await organizers.insertOne(user);
  res.status(201).json({ message: 'Organizer created. Sign in to continue.' });
}));
api.post('/admin/login', adminLimit, asyncRoute(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success || !jwtSecret) return res.status(400).json({ message: 'Enter a valid email and password.' });
  const { organizers } = collections();
  const user = await organizers.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const token = jwt.sign({ role: user.role }, jwtSecret, { subject: String(user._id), expiresIn: '8h' });
  res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
}));
api.use('/admin', requireAdmin);
api.get('/admin/overview', asyncRoute(async (_req, res) => {
  const { colleges, ambassadors, registrations, jobs } = collections();
  const [collegeCount, ambassadorCount, pendingCount, validCount, jobsPending] = await Promise.all([colleges.countDocuments({ status: 'active' }), ambassadors.countDocuments({ status: 'active' }), registrations.countDocuments({ status: 'pending' }), registrations.countDocuments({ status: 'valid' }), jobs.countDocuments({ status: { $in: ['queued', 'failed'] } })]);
  res.json({ colleges: collegeCount, activeAmbassadors: ambassadorCount, pendingRegistrations: pendingCount, validRegistrations: validCount, integrationJobsPending: jobsPending });
}));
api.get('/admin/colleges', asyncRoute(async (_req, res) => { const { colleges } = collections(); res.json({ colleges: await colleges.find().sort({ name: 1 }).toArray() }); }));
api.post('/admin/colleges', asyncRoute(async (req, res) => {
  const parsed = collegeSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Enter a college name and valid location details.' });
  const { colleges } = collections(); const nameNormalized = parsed.data.name.toLowerCase();
  try { const result = await colleges.insertOne({ ...parsed.data, nameNormalized, status: 'active', createdAt: new Date(), updatedAt: new Date() }); res.status(201).json({ id: result.insertedId }); }
  catch (e) { if ((e as { code?: number }).code === 11000) return res.status(409).json({ message: 'That college already exists.' }); throw e; }
}));
api.get('/admin/ambassadors', asyncRoute(async (_req, res) => { const { ambassadors } = collections(); res.json({ ambassadors: await ambassadors.find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray() }); }));
api.post('/admin/ambassadors', asyncRoute(async (req, res) => {
  const parsed = ambassadorSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Enter a valid name, email, and college.' });
  const { ambassadors, colleges } = collections(); if (!ObjectId.isValid(parsed.data.collegeId)) return res.status(400).json({ message: 'Choose a valid college.' });
  const college = await colleges.findOne({ _id: new ObjectId(parsed.data.collegeId), status: 'active' }); if (!college) return res.status(400).json({ message: 'Choose a valid college.' });
  const emailNormalized = parsed.data.email.toLowerCase(); if (await ambassadors.findOne({ emailNormalized })) return res.status(409).json({ message: 'An ambassador with this email already exists.' });
  const referralCode = `NWA${randomBytes(4).toString('hex').toUpperCase()}`;
  const record = { name: parsed.data.name, displayName: parsed.data.name, email: emailNormalized, emailNormalized, collegeId: college._id, collegeName: college.name, status: 'active', referralCode, createdAt: new Date(), updatedAt: new Date() };
  const created = await ambassadors.insertOne(record);
  res.status(201).json({ ambassador: { id: created.insertedId, name: record.name, college: record.collegeName, referralCode, referralUrl: `${process.env.WEB_ORIGIN || allowedOrigin}/register?ref=${referralCode}` } });
}));
api.patch('/admin/registrations/:id/status', asyncRoute(async (req, res) => {
  const parsed = z.object({ status: z.enum(['valid', 'rejected', 'cancelled']), reason: z.string().trim().min(5).max(500) }).safeParse(req.body);
  const registrationParam = req.params.id;
  if (!parsed.success || typeof registrationParam !== 'string' || !ObjectId.isValid(registrationParam)) return res.status(400).json({ message: 'Provide an allowed status and a reason of at least five characters.' });
  const { registrations } = collections(); const id = new ObjectId(registrationParam); const before = await registrations.findOne({ _id: id });
  if (!before) return res.status(404).json({ message: 'Registration not found.' });
  await registrations.updateOne({ _id: id }, { $set: { status: parsed.data.status, updatedAt: new Date() } });
  await collections().jobs.insertOne({ entityType: 'registration', entityId: before.registrationId, jobType: 'audit_status_change', status: 'queued', actorId: res.locals.actor.sub, reason: parsed.data.reason, previousStatus: before.status, newStatus: parsed.data.status, createdAt: new Date(), attemptCount: 0 });
  res.json({ message: 'Registration status updated.' });
}));
api.get('/admin/registrations', asyncRoute(async (req, res) => {
  const { registrations } = collections(); const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const filter = status && ['pending', 'valid', 'rejected', 'cancelled'].includes(status) ? { status } : {};
  const rows = await registrations.find(filter, { projection: { emailNormalized: 0 } }).sort({ createdAt: -1 }).limit(200).toArray(); res.json({ registrations: rows });
}));
app.use((_req, res) => res.status(404).json({ message: 'Not found.' }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { status?: number; message?: string; code?: number };
  if (error.code === 11000) return res.status(409).json({ message: 'A record with those details already exists.' });
  console.error('API error:', error.message || 'unknown');
  res.status(error.status || 500).json({ message: error.status ? error.message : 'The service could not complete that request.' });
});
app.listen(port, () => console.log(`Arena API listening on port ${port}`));
void connectDatabase();




