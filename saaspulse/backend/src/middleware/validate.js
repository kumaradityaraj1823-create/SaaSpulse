
/**
 * validate({ body, query, params }) — parses the request parts with Zod schemas.
 * Parsed (coerced, defaulted) values replace the originals on req.valid.
 */
module.exports = (schemas) => (req, _res, next) => {
  try {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  } catch (err) {
    next(err);
  }
};
