const planService = require('../services/plan.service');

exports.list = async (_req, res) => {
  res.json({ success: true, data: await planService.listWithStats() });
};

exports.create = async (req, res) => {
  const data = await planService.create(req.valid.body);
  res.status(201).json({ success: true, message: 'Plan created.', data });
};

exports.update = async (req, res) => {
  const data = await planService.update(req.valid.params.id, req.valid.body);
  res.json({ success: true, message: 'Plan updated.', data });
};

exports.remove = async (req, res) => {
  const data = await planService.remove(req.valid.params.id);
  res.json({ success: true, message: 'Plan deleted.', data });
};
