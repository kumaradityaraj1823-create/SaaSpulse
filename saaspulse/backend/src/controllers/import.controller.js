const importService = require('../services/import.service');
const ApiError = require('../utils/ApiError');

exports.importCustomers = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Attach a CSV file in the "file" field.');
  const result = await importService.importCustomers(req.file.buffer, req.valid.query);
  res.status(result.dryRun ? 200 : 201).json({ success: true, data: result });
};

exports.template = (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="saaspulse-customers-template.csv"');
  res.send(importService.TEMPLATE);
};
