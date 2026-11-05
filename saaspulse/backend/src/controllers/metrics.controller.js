const metricsService = require('../services/metrics.service');
const activityService = require('../services/activity.service');

exports.overview = async (req, res) => {
  res.json({ success: true, data: await metricsService.overview(req.valid.query) });
};

exports.activity = async (req, res) => {
  res.json({ success: true, data: await activityService.listRecent(req.valid.query) });
};
