// tests/collaborator.test.js
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const {  afterEach } = require('@jest/globals');
const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Importamos la app, no index.js
const Colab = require('../models/collaborator');
const Project = require('../models/projects'); // Necesario si probamos la relación

const request = supertest(app);

describe('API de Colaboradores (/api/collaborator)', () => {
  let mongoServer;

  // --- Ciclo de vida de las pruebas ---
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Limpiar la base de datos después de CADA prueba para asegurar aislamiento
  afterEach(async () => {
    await Colab.deleteMany({});
    await Project.deleteMany({}); // También limpiamos proyectos por si los creamos
  });


  // --- PRUEBA 1: REGISTRAR UN COLABORADOR (CREATE) ---
  describe('POST /api/collaborator', () => {
    it('Debería crear un nuevo colaborador con datos válidos y devolver 201', async () => {
      const colabData = {
        dni: "12345678A",
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan.perez@example.com",
        estado: "Activo",
        roles: [{ rol: "Developer", seniority: "Senior" }]
      };

      const response = await request.post('/api/collaborator').send(colabData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.colaborador).toBeDefined();
      expect(response.body.colaborador.dni).toBe(colabData.dni);
      expect(response.body.colaborador.email).toBe(colabData.email);
      expect(response.body.colaborador.id).toBeDefined();
      expect(response.body.colaborador._id).toBeUndefined();
    });

    it('Debería devolver 409 si el DNI ya existe', async () => {
      // 1. Crear un colaborador inicial
      const initialColab = { dni: "87654321B", first_name: "Ana", last_name: "García", email: "ana.garcia@example.com", estado: "Activo" };
      await new Colab(initialColab).save();

      // 2. Intentar crear otro con el mismo DNI
      const duplicateColabData = { dni: "87654321B", first_name: "Pedro", last_name: "López", email: "pedro.lopez@example.com", estado: "Activo" };
      const response = await request.post('/api/collaborator').send(duplicateColabData);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Ya existe un colaborador con el DNI');
    });
  });


  // --- PRUEBA 2: OBTENER UN COLABORADOR POR ID (READ) ---
  describe('GET /api/collaborator/:id', () => {
    it('Debería devolver un colaborador existente, poblando sus proyectos', async () => {
      // 1. Crear un proyecto de referencia
      const project = await new Project({
        managerId: "mngr1", managerName: "Manager", managerVisibleInOrgChart: true, name: "Proyecto Test",
        client: "Cliente Test", status: "Activo", projectType: "Web", startDate: new Date(),
        endDate: new Date(), category: "privado", budget: 1000
      }).save();

      // 2. Crear un colaborador y asignarle el proyecto
      const colab = await new Colab({
        dni: "11223344C", first_name: "Lucía", last_name: "Martínez",
        email: "lucia.martinez@example.com", estado: "Activo",
        Proyectos: [{ projectId: project._id, rol: "QA", seniority: "Junior" }]
      }).save();
      const colabId = colab.id;

      // 3. Realizar la petición
      const response = await request.get(`/api/collaborator/${colabId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.collaborator.id).toBe(colabId);
      expect(response.body.collaborator.first_name).toBe("Lucía");
      
      // 4. Verificar que el proyecto fue poblado correctamente
      expect(response.body.collaborator.Proyectos).toHaveLength(1);
      expect(response.body.collaborator.Proyectos[0].projectId).toBeInstanceOf(Object);
      expect(response.body.collaborator.Proyectos[0].projectId.name).toBe("Proyecto Test");
      expect(response.body.collaborator.Proyectos[0].rol).toBe("QA");
    });

    it('Debería devolver 404 si el colaborador no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      const response = await request.get(`/api/collaborator/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });


  // --- PRUEBA 3: ACTUALIZAR UN COLABORADOR (UPDATE) ---
  describe('PUT /api/collaborator/:id', () => {
    it('Debería actualizar un colaborador y devolver el documento actualizado', async () => {
      // 1. Crear el colaborador a actualizar
      const colab = await new Colab({
        dni: "55667788D", first_name: "Carlos", last_name: "Sánchez",
        email: "carlos.sanchez@example.com", estado: "Activo",
      }).save();
      const colabId = colab.id;

      const updates = {
        estado: "De vacaciones",
        email: "c.sanchez@newdomain.com"
      };

      // 2. Realizar la petición PUT
      const response = await request.put(`/api/collaborator/${colabId}`).send(updates);

      expect(response.status).toBe(200);
      expect(response.body.colaborador.estado).toBe(updates.estado);
      expect(response.body.colaborador.email).toBe(updates.email);
      expect(response.body.colaborador.last_edited_on).toBeDefined();
    });
  });


  // --- PRUEBA 4: ELIMINAR (LÓGICAMENTE) UN COLABORADOR (DELETE) ---
  describe('DELETE /api/collaborator/:id', () => {
    it('Debería marcar un colaborador como eliminado y devolver un mensaje de confirmación', async () => {
        // 1. Crear el colaborador a eliminar
        const colab = await new Colab({
            dni: "99887766E", first_name: "Elena", last_name: "Ruiz",
            email: "elena.ruiz@example.com", estado: "Activo",
        }).save();
        const colabId = colab.id;

        // 2. Realizar la petición de borrado
        const deleteResponse = await request.delete(`/api/collaborator/${colabId}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toBe("Colaborador eliminado correctamente");
        expect(deleteResponse.body.id).toBe(colabId);

        // 3. Verificar que el colaborador ya no se obtiene en la lista general
        const getResponse = await request.get('/api/collaborator');
        const found = getResponse.body.find(c => c.id === colabId);
        expect(found).toBeUndefined();

        // 4. (Opcional) Verificar directamente en la BD que 'delete_at' fue establecido
        const deletedColabInDb = await Colab.findById(colabId);
        expect(deletedColabInDb.delete_at).toBeInstanceOf(Date);
    });
  });

});