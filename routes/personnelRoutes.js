const r = require('express').Router();
const c = require('../controllers/personnelController');
const auth = require('../middlewares/auth');

r.post('/',[auth.ensureAuth, auth.hasRole(['administrador'])], c.create);
r.get('/',[auth.ensureAuth, auth.hasRole(['administrador'])],  c.getAll);
r.put('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], c.update);
r.delete('/:id',[auth.ensureAuth, auth.hasRole(['administrador'])], c.remove);
module.exports = r;
