// tests/vacancie.test.js
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { beforeEach, afterEach } = require('@jest/globals');
const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Importamos la app configurada
const Vacancie = require('../models/vacancy');
const Project = require('../models/projects'); // ¡Imprescindible para crear la dependencia!

const request = supertest(app);

describe('API de Vacantes (/api/vacancie)', () => {
  let mongoServer;
  let testProject; // Variable para guardar un proyecto de prueba y usarlo en varios tests

  // --- Ciclo de vida de las pruebas ---
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });
  
  // Antes de cada prueba, creamos un proyecto base para usarlo como dependencia
  beforeEach(async () => {
    testProject = await new Project({
        managerId: "proj-mngr-1", managerName: "Project Manager", managerVisibleInOrgChart: true,
        name: "Proyecto Base para Vacantes", client: "Cliente de Prueba", status: "Activo",
        projectType: "Desarrollo", startDate: new Date(), endDate: new Date(),
        category: "privado", budget: 10000
    }).save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Limpiar ambas colecciones después de cada prueba
  afterEach(async () => {
    await Vacancie.deleteMany({});
    await Project.deleteMany({});
  });


  // --- PRUEBA 1: REGISTRAR UNA VACANTE (CREATE) ---
  describe('POST /api/vacancie', () => {
    it('Debería crear una nueva vacante asociada a un proyecto existente y devolver 201', async () => {
      const vacancieData = {
        manager_id: "vac-mngr-1",
        manager_name: "Hiring Manager",
        projectId: testProject.id, // Usamos el ID del proyecto que creamos en beforeEach
        vacancieName: "Backend Developer",
        time: 40,
        orderDate: new Date(),
        startDate: new Date(),
        seniority: "Semi-Senior"
      };

      const response = await request.post('/api/vacancie').send(vacancieData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.vacancie).toBeDefined();
      expect(response.body.vacancie.vacancieName).toBe("Backend Developer");

      // Verificar que el projectId fue poblado correctamente en la respuesta
      expect(response.body.vacancie.projectId).toBeInstanceOf(Object);
      expect(response.body.vacancie.projectId.id).toBe(testProject.id);
      expect(response.body.vacancie.projectId.name).toBe("Proyecto Base para Vacantes");
    });

    it('Debería devolver 404 si el projectId no corresponde a un proyecto existente', async () => {
        const nonExistentProjectId = new mongoose.Types.ObjectId().toHexString();
        const vacancieData = {
            manager_id: "vac-mngr-1", manager_name: "Hiring Manager",
            projectId: nonExistentProjectId, // ID inválido
            vacancieName: "Frontend Developer", time: 40, orderDate: new Date(),
            startDate: new Date(), seniority: "Senior"
        };
  
        const response = await request.post('/api/vacancie').send(vacancieData);
  
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('El proyecto con ID');
      });
  });


  // --- PRUEBA 2: OBTENER UNA VACANTE POR ID (READ) ---
  describe('GET /api/vacancie/:id', () => {
    it('Debería devolver una vacante existente, poblando los datos del proyecto', async () => {
      // 1. Crear la vacante a buscar
      const vacancie = await new Vacancie({
        manager_id: "mngr-2", manager_name: "Manager 2",
        projectId: testProject.id,
        vacancieName: "Data Scientist", time: 20, orderDate: new Date(),
        startDate: new Date(), seniority: "Expert"
      }).save();
      const vacancieId = vacancie.id;

      // 2. Realizar la petición
      const response = await request.get(`/api/vacancie/${vacancieId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(vacancieId);
      expect(response.body.data.vacancieName).toBe("Data Scientist");

      // 3. Verificar que el proyecto fue poblado
      expect(response.body.data.projectId).toBeDefined();
      expect(response.body.data.projectId.name).toBe("Proyecto Base para Vacantes");
      expect(response.body.data.projectId.client).toBe("Cliente de Prueba");
    });

    it('Debería devolver 404 si la vacante no existe', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toHexString();
        const response = await request.get(`/api/vacancie/${nonExistentId}`);
        
        expect(response.status).toBe(404);
    });
  });


  // --- PRUEBA 3: ACTUALIZAR UNA VACANTE (UPDATE) ---
  describe('PUT /api/vacancie/:id', () => {
    it('Debería actualizar una vacante y devolver el documento actualizado', async () => {
      // 1. Crear la vacante a actualizar
      const vacancie = await new Vacancie({
        manager_id: "mngr-3", manager_name: "Manager 3", projectId: testProject.id,
        vacancieName: "DevOps Engineer", time: 40, orderDate: new Date(),
        startDate: new Date(), seniority: "Senior"
      }).save();
      const vacancieId = vacancie.id;

      const updates = {
        seniority: "Lead",
        time: 30
      };

      // 2. Realizar la petición PUT
      const response = await request.put(`/api/vacancie/${vacancieId}`).send(updates);

      expect(response.status).toBe(200);
      expect(response.body.vacancie.seniority).toBe(updates.seniority);
      expect(response.body.vacancie.time).toBe(updates.time);
      expect(response.body.vacancie.last_edited_on).toBeDefined();
    });
  });


  // --- PRUEBA 4: ELIMINAR (LÓGICAMENTE) UNA VACANTE (DELETE) ---
  describe('DELETE /api/vacancie/:id', () => {
    it('Debería marcar una vacante como eliminada y devolver un mensaje de confirmación', async () => {
        // 1. Crear la vacante a eliminar
        const vacancie = await new Vacancie({
            manager_id: "mngr-4", manager_name: "Manager 4", projectId: testProject.id,
            vacancieName: "Product Owner", time: 40, orderDate: new Date(),
            startDate: new Date(), seniority: "Manager"
        }).save();
        const vacancieId = vacancie.id;

        // 2. Realizar la petición de borrado
        const deleteResponse = await request.delete(`/api/vacancie/${vacancieId}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toBe("Vacante marcada como eliminada correctamente");
        expect(deleteResponse.body.id).toBe(vacancieId);

        // 3. Verificar que la vacante ya no se obtiene en la lista general
        const getResponse = await request.get('/api/vacancie');
        const found = getResponse.body.find(v => v.id === vacancieId);
        expect(found).toBeUndefined();

        // 4. (Opcional) Verificar en la BD que 'delete_at' fue establecido
        const deletedVacancieInDb = await Vacancie.findById(vacancieId);
        expect(deletedVacancieInDb.delete_at).toBeInstanceOf(Date);
    });
  });

});