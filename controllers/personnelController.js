const Personnel      = require('../models/Personnel');
const ExtraFieldDef  = require('../models/ExtraFieldDef');

/* Listar */
exports.getAll = (_req, res, next) =>
  Personnel.find().then(res.json.bind(res)).catch(next);

/* Crear */
exports.create = async (req, res, next) => {
  try {
    // valida que los keys extra existan en el catálogo
    const defs = await ExtraFieldDef.find().select('key');
    const allowed = defs.map(d => d.key);
    const unknown = Object.keys(req.body.extraData ?? {}).filter(k => !allowed.includes(k));
    if (unknown.length) return res.status(400).json({ message: 'Campos extra desconocidos', unknown });

    const p = await Personnel.create(req.body);
    res.status(201).json(p);
  } catch (e) { next(e); }
};

/* Update & delete */
exports.update = (req,res,next)=>
  Personnel.findByIdAndUpdate(req.params.id, req.body, { new:true })
    .then(r=>r?res.json(r):res.status(404).end()).catch(next);

exports.remove = (req,res,next)=>
  Personnel.findByIdAndDelete(req.params.id)
    .then(()=>res.json({message:'Eliminado'})).catch(next);

/* Get by ID */
exports.getById = (req, res, next) =>
  Personnel.findById(req.params.id)
    .then(r => r ? res.json(r) : res.status(404).end())
    .catch(next);
