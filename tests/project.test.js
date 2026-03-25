// tests/project.test.js (versión corregida)
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const {  afterEach } = require('@jest/globals');
const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ¡CAMBIO CLAVE! Importamos la app, no el servidor completo.
const app = require('../app'); 

const Project = require('../models/projects');

const request = supertest(app);

describe('API de Proyectos (/api/projects)', () => {
  let mongoServer;

  // ANTES de todas las pruebas, iniciar el servidor de BD en memoria y CONECTARSE
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    // Esta será la ÚNICA conexión a la base de datos durante los tests
    await mongoose.connect(mongoUri, {}); 
  });

  // DESPUÉS de todas las pruebas, desconectar y detener todo
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // DESPUÉS de CADA prueba, limpiar la colección de proyectos
  afterEach(async () => {
    await Project.deleteMany({});
  
  });

  // --- Tus tests (no necesitan cambios en su lógica interna) ---
  
  describe('POST /api/projects/register', () => {
    it('Debería crear un nuevo proyecto con datos válidos y devolver un 201', async () => {
      const projectData = {
        managerId: "manager123", managerName: "Ana Pérez", managerVisibleInOrgChart: true,
        name: "Proyecto de Prueba Alpha", client: "Cliente Importante S.A.", status: "Activo",
        projectType: "Desarrollo Web", startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-12-31T00:00:00.000Z", category: "privado", budget: 50000,
        description: "Un proyecto increíble para probar la API."
      };

      const response = await request.post('/api/projects/register').send(projectData);
      expect(response.status).toBe(201);
      expect(response.body.project.name).toBe(projectData.name);
      expect(response.body.project.id).toBeDefined();
      expect(response.body.project._id).toBeUndefined();
    });

    it('Debería devolver un 409 si ya existe un proyecto con el mismo nombre', async () => {
      const projectData = {
        managerId: "manager123", managerName: "Ana Pérez", managerVisibleInOrgChart: true,
        name: "Proyecto Duplicado", client: "Cliente", status: "Activo", projectType: "Test",
        startDate: new Date(), endDate: new Date(), category: "inversion", budget: 100
      };
      await new Project(projectData).save();
      
      const response = await request.post('/api/projects/register').send(projectData);
      expect(response.status).toBe(409);
      expect(response.body.message).toContain("Ya existe un proyecto activo con el nombre");
    });
  });

  // ... (El resto de tus pruebas 'describe' para GET, PUT, POST/delete van aquí sin cambios) ...
  // --- PRUEBA 2: OBTENER UN PROYECTO POR ID (READ) ---
  describe('GET /api/projects/:id', () => {
    // ...
  });
  // --- PRUEBA 3: ACTUALIZAR UN PROYECTO (UPDATE) ---
  describe('PUT /api/projects/:id', () => {
    // ...
  });
  // --- PRUEBA 4: ELIMINAR (LÓGICAMENTE) UN PROYECTO (DELETE) ---
  describe('POST /api/projects/:id (Soft Delete)', () => {
    // ...
  });

});