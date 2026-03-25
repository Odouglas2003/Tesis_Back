const r = require('express').Router();
const c = require('../controllers/basicFieldController');
const auth = require('../middlewares/auth');
r.get('/',[auth.ensureAuth, auth.hasRole(['administrador'])] ,c.getAll);
module.exports = r;
