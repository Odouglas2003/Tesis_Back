const ExtraFieldDef = require('../models/ExtraFieldDef');
const Personnel     = require('../models/Personnel');

/* Crear */
exports.create = (req, res, next) =>
  ExtraFieldDef.create(req.body).then(r => res.status(201).json(r)).catch(next);

/* Listar */
exports.getAll = (_req, res, next) =>
  ExtraFieldDef.find().sort({ order: 1 }).then(res.json.bind(res)).catch(next);

/* Actualizar */
exports.update = (req, res, next) =>
  ExtraFieldDef.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(r => r ? res.json(r) : res.status(404).end())
    .catch(next);

/* Eliminar: bloquea si está en uso */
exports.remove = async (req, res, next) => {
  try {
    const field = await ExtraFieldDef.findById(req.params.id);
    if (!field) return res.status(404).end();
    const inUse = await Personnel.exists({ [`extraData.${field.key}`]: { $exists: true } });
    if (inUse) return res.status(409).json({ message: 'Campo en uso, no se puede borrar' });
    await field.deleteOne();
    res.json({ message: 'Eliminado' });
  } catch (e) { next(e); }
};
