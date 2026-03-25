const BasicFieldDef = require('../models/BasicFieldDef');

exports.getAll = (_req, res, next) =>
  BasicFieldDef.find().sort({ order: 1 }).then(res.json.bind(res)).catch(next);
