const mongoose = require('mongoose');
const { ZodError } = require('zod');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on the server.';
  let details;

  if (err instanceof ApiError) {
    ({ status, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Some fields are invalid.';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}: ${JSON.stringify(err.value)}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Some fields are invalid.';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err && err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field === 'slug' ? 'name' : field} already exists.`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than the 5 MB limit.' : err.message;
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500 && !env.isTest) console.error(err);

  res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}), ...(!env.isProd && status >= 500 ? { stack: err.stack } : {}) },
  });
}

module.exports = { notFound, errorHandler };
