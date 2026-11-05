const express = require('express');
const multer = require('multer');
const validate = require('../middleware/validate');
const h = require('../utils/asyncHandler');
const s = require('../validators/schemas');
const customers = require('../controllers/customer.controller');
const plans = require('../controllers/plan.controller');
const metrics = require('../controllers/metrics.controller');
const imports = require('../controllers/import.controller');
const ApiError = require('../utils/ApiError');
const { dbStatus } = require('../config/db');

const router = express.Router();

// CSV files are held in memory (max 5 MB) — nothing is written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.csv$/i.test(file.originalname) || /csv|text\/plain|excel/.test(file.mimetype);
    cb(ok ? null : ApiError.badRequest('Only .csv files can be imported.'), ok);
  },
});

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', db: dbStatus(), uptime: Math.round(process.uptime()), time: new Date().toISOString() });
});

// Metrics
router.get('/metrics/overview', validate({ query: s.overviewQuery }), h(metrics.overview));
router.get('/activity', validate({ query: s.activityQuery }), h(metrics.activity));

// Customers
router.get('/customers', validate({ query: s.listCustomersQuery }), h(customers.list));
router.get('/customers/export', validate({ query: s.listCustomersQuery }), h(customers.exportCsv));
router.post('/customers', validate({ body: s.createCustomerBody }), h(customers.create));
router.get('/customers/:id', validate({ params: s.idParams }), h(customers.get));
router.patch('/customers/:id', validate({ params: s.idParams, body: s.updateCustomerBody }), h(customers.update));
router.patch('/customers/:id/status', validate({ params: s.idParams, body: s.updateStatusBody }), h(customers.updateStatus));
router.delete('/customers/:id', validate({ params: s.idParams }), h(customers.remove));

// Plans
router.get('/plans', h(plans.list));
router.post('/plans', validate({ body: s.createPlanBody }), h(plans.create));
router.patch('/plans/:id', validate({ params: s.idParams, body: s.updatePlanBody }), h(plans.update));
router.delete('/plans/:id', validate({ params: s.idParams }), h(plans.remove));

// CSV import
router.get('/imports/template', imports.template);
router.post('/imports/customers', upload.single('file'), validate({ query: s.importQuery }), h(imports.importCustomers));

module.exports = router;
