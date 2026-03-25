// script para "sembrar" los campos básicos
require('dotenv').config();
const mongoose = require('mongoose');
const BasicFieldDef = require('../models/BasicFieldDef');

(async () => {
  await mongoose.connect(process.env.MONGO_HOST);

  const defaults = [
    { key: 'idExterno',  label: 'ID externo',          type: 'number', order: 0 },
    { key: 'first_name', label: 'Nombre',              type: 'string', order: 1 },
    { key: 'last_name',  label: 'Apellido',            type: 'string', order: 2 },
    { key: 'email',      label: 'Email',               type: 'string', order: 3 },
    { key: 'birthDate',  label: 'Fecha de nacimiento', type: 'date',   order: 4 },
  ];  

  for (const def of defaults) {
    // upsert: inserta si no existe
    await BasicFieldDef.updateOne(
      { key: def.key },
      { $set: def },
      { upsert: true }
    );
  }

  console.log('Campos básicos sembrados');
  process.exit(0);
})();
