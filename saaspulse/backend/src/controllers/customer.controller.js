const customerService = require('../services/customer.service');

exports.list = async (req, res) => {
  const result = await customerService.list(req.valid.query);
  res.json({ success: true, ...result });
};

exports.get = async (req, res) => {
  res.json({ success: true, data: await customerService.getById(req.valid.params.id) });
};

exports.create = async (req, res) => {
  const data = await customerService.create(req.valid.body);
  res.status(201).json({ success: true, message: 'Customer added.', data });
};

exports.update = async (req, res) => {
  const data = await customerService.update(req.valid.params.id, req.valid.body);
  res.json({ success: true, message: 'Customer updated.', data });
};

exports.updateStatus = async (req, res) => {
  const data = await customerService.setStatus(req.valid.params.id, req.valid.body);
  res.json({ success: true, message: data.status === 'churned' ? 'Customer marked as churned.' : 'Customer reactivated.', data });
};

exports.remove = async (req, res) => {
  const data = await customerService.remove(req.valid.params.id);
  res.json({ success: true, message: 'Customer deleted.', data });
};

exports.exportCsv = async (req, res) => {
  const csv = await customerService.exportCsv(req.valid.query);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="customers-${stamp}.csv"`);
  res.send(csv);
};
