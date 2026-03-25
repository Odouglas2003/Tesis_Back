require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Role = require("../models/roles");
const Jornada = require("../models/jornada");
const Technology = require("../models/technologies");
const LegacyTechnology = require("../models/tecnology");
const Client = require("../models/client");
const StateProject = require("../models/stateprojects");
const Collaborator = require("../models/collaborator");
const Project = require("../models/projects");
const Vacancy = require("../models/vacancy");
const Notification = require("../models/notification");
const BasicFieldDef = require("../models/BasicFieldDef");
const ExtraFieldDef = require("../models/ExtraFieldDef");
const Personnel = require("../models/Personnel");

const today = new Date();

const addDays = (baseDate, days) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
};

const createPasswordHash = (password) => bcrypt.hash(password, 10);

async function upsertOne(Model, filter, data, options = {}) {
  return Model.findOneAndUpdate(
    filter,
    {
      $set: data,
      $setOnInsert: options.setOnInsert || {},
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function seedCatalogs() {
  const basicFields = [
    { key: "idExterno", label: "ID externo", type: "number", order: 0 },
    { key: "first_name", label: "Nombre", type: "string", order: 1 },
    { key: "last_name", label: "Apellido", type: "string", order: 2 },
    { key: "email", label: "Email", type: "string", order: 3 },
    { key: "birthDate", label: "Fecha de nacimiento", type: "date", order: 4 },
  ];

  for (const field of basicFields) {
    await upsertOne(BasicFieldDef, { key: field.key }, field);
  }

  const extraFields = [
    {
      key: "nivelIngles",
      label: "Nivel de ingles",
      type: "select",
      options: ["Basico", "Intermedio", "Avanzado"],
      order: 0,
    },
    {
      key: "certificaciones",
      label: "Certificaciones",
      type: "multiselect",
      options: ["AWS", "Azure", "Scrum", "ISTQB"],
      order: 1,
    },
    {
      key: "poseeNotebook",
      label: "Posee notebook",
      type: "boolean",
      order: 2,
    },
  ];

  for (const field of extraFields) {
    await upsertOne(ExtraFieldDef, { key: field.key }, field);
  }

  const roles = [
    { name: "Backend Developer", description: "Desarrolla y mantiene servicios backend." },
    { name: "Frontend Developer", description: "Construye interfaces y experiencia de usuario." },
    { name: "Full Stack Developer", description: "Trabaja en frontend y backend." },
    { name: "QA Engineer", description: "Asegura calidad funcional y automatizada." },
    { name: "DevOps Engineer", description: "Automatiza despliegues e infraestructura." },
    { name: "Project Manager", description: "Coordina alcance, tiempos y equipo." },
    { name: "Data Engineer", description: "Disena pipelines y plataformas de datos." },
    { name: "UX/UI Designer", description: "Disena flujos y prototipos de interfaz." },
  ];

  for (const role of roles) {
    await upsertOne(Role, { name: role.name }, { ...role, status: true });
  }

  const jornadas = [
    { name: "Full Time", hours: 8, description: "Jornada completa", status: true },
    { name: "Part Time", hours: 6, description: "Jornada reducida", status: true },
    { name: "Media Jornada", hours: 4, description: "Media jornada", status: true },
  ];

  const jornadaDocs = {};
  for (const jornada of jornadas) {
    jornadaDocs[jornada.name] = await upsertOne(Jornada, { name: jornada.name }, jornada);
  }

  const technologies = [
    { name: "JavaScript", description: "Lenguaje base para apps web.", status: true },
    { name: "TypeScript", description: "JavaScript tipado para frontend y backend.", status: true },
    { name: "Node.js", description: "Runtime para servicios backend.", status: true },
    { name: "React", description: "Libreria para interfaces web.", status: true },
    { name: "MongoDB", description: "Base de datos documental.", status: true },
    { name: "Docker", description: "Contenerizacion y entornos reproducibles.", status: true },
    { name: "AWS", description: "Servicios cloud y storage.", status: true },
    { name: "Python", description: "Automatizacion, datos e integraciones.", status: true },
    { name: "PostgreSQL", description: "Base de datos relacional.", status: true },
    { name: "Cypress", description: "Testing end to end.", status: true },
  ];

  const technologyDocs = {};
  let legacyId = 1;
  for (const technology of technologies) {
    technologyDocs[technology.name] = await upsertOne(
      Technology,
      { name: technology.name },
      technology
    );

    await upsertOne(
      LegacyTechnology,
      { tecnologias: technology.name },
      {
        id: legacyId,
        tecnologias: technology.name,
        first_name: "Demo",
        last_name: "Seed",
      }
    );
    legacyId += 1;
  }

  const clients = [
    {
      name: "Acme Retail",
      cuit: "30-71234567-9",
      razonSocial: "Acme Retail S.A.",
      description: "Cliente retail para ecommerce y omnicanalidad.",
      status: true,
    },
    {
      name: "Gobierno de Mendoza",
      cuit: "30-69999999-1",
      razonSocial: "Gobierno de Mendoza",
      description: "Organismo publico para tramites y transformacion digital.",
      status: true,
    },
    {
      name: "Austral Ventures",
      cuit: "30-71111222-3",
      razonSocial: "Austral Ventures S.A.",
      description: "Fondo de inversion para iniciativas data driven.",
      status: true,
    },
  ];

  for (const client of clients) {
    await upsertOne(Client, { name: client.name }, client);
  }

  const states = [
    { id: "Activo", status: "Activo" },
    { id: "En pausa", status: "En pausa" },
    { id: "Planificacion", status: "Planificacion" },
    { id: "Finalizado", status: "Finalizado" },
  ];

  for (const state of states) {
    await upsertOne(StateProject, { id: state.id }, state);
  }

  const personnel = [
    {
      companyId: 1,
      idExterno: 1001,
      first_name: "Julieta",
      last_name: "Campos",
      email: "julieta.campos@demo.local",
      birthDate: new Date("1993-04-14"),
      extraData: {
        nivelIngles: "Avanzado",
        certificaciones: ["Scrum"],
        poseeNotebook: true,
      },
    },
    {
      companyId: 1,
      idExterno: 1002,
      first_name: "Bruno",
      last_name: "Sosa",
      email: "bruno.sosa@demo.local",
      birthDate: new Date("1990-09-02"),
      extraData: {
        nivelIngles: "Intermedio",
        certificaciones: ["AWS", "Azure"],
        poseeNotebook: true,
      },
    },
  ];

  for (const person of personnel) {
    await upsertOne(Personnel, { email: person.email }, person);
  }

  return { jornadaDocs, technologyDocs };
}

async function seedUsers() {
  const adminHash = await createPasswordHash("RubikAdmin2026!");
  const managerHash = await createPasswordHash("RubikManager2026!");

  const users = [
    {
      name: "Administrador",
      email: "admin@rubik.local",
      password: adminHash,
      rol: "administrador",
      status: "active",
      delete_at: null,
    },
    {
      name: "Ana Perez",
      email: "ana.perez@rubik.local",
      password: managerHash,
      rol: "manager",
      status: "active",
      delete_at: null,
    },
    {
      name: "Luis Gomez",
      email: "luis.gomez@rubik.local",
      password: managerHash,
      rol: "manager",
      status: "active",
      delete_at: null,
    },
  ];

  await User.updateMany({ temporalToken: null }, { $unset: { temporalToken: 1 } });

  const userDocs = {};
  for (const user of users) {
    userDocs[user.email] = await User.findOneAndUpdate(
      { email: user.email },
      {
        $set: user,
        $unset: { temporalToken: 1 },
        $setOnInsert: { created_at: new Date() },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  return userDocs;
}

async function seedDomainData(jornadaDocs, technologyDocs, userDocs) {
  const collaboratorsSeed = [
    {
      dni: "30111222",
      first_name: "Sofia",
      last_name: "Alvarez",
      email: "sofia.alvarez@rubik.local",
      estado: "Activo",
      tecnologias: ["React", "TypeScript", "JavaScript"],
      roles: [{ rol: "Frontend Developer", seniority: "Senior" }],
      jornadaName: "Full Time",
      start_contrato: addDays(today, -180),
      fin_contrato: addDays(today, 120),
    },
    {
      dni: "30222333",
      first_name: "Martin",
      last_name: "Quiroga",
      email: "martin.quiroga@rubik.local",
      estado: "Activo",
      tecnologias: ["Node.js", "MongoDB", "Docker"],
      roles: [{ rol: "Backend Developer", seniority: "Semi-Senior" }],
      jornadaName: "Full Time",
      start_contrato: addDays(today, -220),
      fin_contrato: addDays(today, 18),
    },
    {
      dni: "30333444",
      first_name: "Valentina",
      last_name: "Costa",
      email: "valentina.costa@rubik.local",
      estado: "Activo",
      tecnologias: ["Python", "AWS", "PostgreSQL"],
      roles: [{ rol: "Data Engineer", seniority: "Senior" }],
      jornadaName: "Part Time",
      start_contrato: addDays(today, -300),
      fin_contrato: addDays(today, 60),
    },
    {
      dni: "30444555",
      first_name: "Diego",
      last_name: "Ramirez",
      email: "diego.ramirez@rubik.local",
      estado: "Activo",
      tecnologias: ["Cypress", "JavaScript"],
      roles: [{ rol: "QA Engineer", seniority: "Junior" }],
      jornadaName: "Media Jornada",
      start_contrato: addDays(today, -90),
      fin_contrato: addDays(today, 210),
    },
    {
      dni: "30555666",
      first_name: "Paula",
      last_name: "Medina",
      email: "paula.medina@rubik.local",
      estado: "Activo",
      tecnologias: ["React", "Node.js", "MongoDB"],
      roles: [{ rol: "Full Stack Developer", seniority: "Semi-Senior" }],
      jornadaName: "Full Time",
      start_contrato: addDays(today, -150),
      fin_contrato: addDays(today, 75),
    },
    {
      dni: "30666777",
      first_name: "Tomas",
      last_name: "Ibarra",
      email: "tomas.ibarra@rubik.local",
      estado: "Activo",
      tecnologias: ["AWS", "Docker", "Node.js"],
      roles: [{ rol: "DevOps Engineer", seniority: "Senior" }],
      jornadaName: "Full Time",
      start_contrato: addDays(today, -260),
      fin_contrato: addDays(today, 35),
    },
  ];

  const collaboratorDocs = {};
  for (const collaborator of collaboratorsSeed) {
    collaboratorDocs[collaborator.email] = await upsertOne(
      Collaborator,
      { email: collaborator.email },
      {
        dni: collaborator.dni,
        first_name: collaborator.first_name,
        last_name: collaborator.last_name,
        email: collaborator.email,
        estado: collaborator.estado,
        tecnologias: collaborator.tecnologias,
        roles: collaborator.roles,
        jornadaId: jornadaDocs[collaborator.jornadaName]._id,
        Proyectos: [],
        honorarios: 0,
        horasAsignadas: 0,
        start_contrato: collaborator.start_contrato,
        fin_contrato: collaborator.fin_contrato,
        delete_at: null,
        last_edited_by: "seed:demo",
        last_edited_on: new Date(),
      },
      { setOnInsert: { created_at: new Date() } }
    );
  }

  const projectSeed = [
    {
      name: "Plataforma Ecommerce Andina",
      client: "Acme Retail",
      status: "Activo",
      phase: "Construccion",
      projectType: "Desarrollo Web",
      category: "Privado",
      budget: 85000,
      startDate: addDays(today, -120),
      endDate: addDays(today, 140),
      description: "Modernizacion de ecommerce con catalogo, checkout y panel operativo.",
      managerEmail: "ana.perez@rubik.local",
      assigned: [
        {
          collaboratorEmail: "sofia.alvarez@rubik.local",
          rol: "Frontend Developer",
          seniority: "Senior",
          horasAsignadas: 8,
        },
        {
          collaboratorEmail: "valentina.costa@rubik.local",
          rol: "Data Engineer",
          seniority: "Senior",
          horasAsignadas: 4,
        },
      ],
    },
    {
      name: "Portal de Tramites Digitales",
      client: "Gobierno de Mendoza",
      status: "Activo",
      phase: "QA",
      projectType: "Transformacion Digital",
      category: "Gobierno",
      budget: 120000,
      startDate: addDays(today, -90),
      endDate: addDays(today, 18),
      description: "Portal para tramites ciudadanos con seguimiento y expedientes.",
      managerEmail: "luis.gomez@rubik.local",
      assigned: [
        {
          collaboratorEmail: "martin.quiroga@rubik.local",
          rol: "Backend Developer",
          seniority: "Semi-Senior",
          horasAsignadas: 4,
        },
        {
          collaboratorEmail: "tomas.ibarra@rubik.local",
          rol: "DevOps Engineer",
          seniority: "Senior",
          horasAsignadas: 8,
        },
      ],
    },
    {
      name: "Data Lake Comercial",
      client: "Austral Ventures",
      status: "Planificacion",
      phase: "Discovery",
      projectType: "Data Platform",
      category: "Inversion",
      budget: 64000,
      startDate: addDays(today, -20),
      endDate: addDays(today, 95),
      description: "Centralizacion de datos de ventas, marketing y finanzas.",
      managerEmail: "ana.perez@rubik.local",
      assigned: [
        {
          collaboratorEmail: "valentina.costa@rubik.local",
          rol: "Data Engineer",
          seniority: "Senior",
          horasAsignadas: 4,
        },
        {
          collaboratorEmail: "paula.medina@rubik.local",
          rol: "Full Stack Developer",
          seniority: "Semi-Senior",
          horasAsignadas: 6,
        },
      ],
    },
  ];

  const projectDocs = {};
  for (const project of projectSeed) {
    const manager = userDocs[project.managerEmail];
    const assignedPersons = project.assigned.map((assignment) => {
      const collaborator = collaboratorDocs[assignment.collaboratorEmail];
      return {
        id: collaborator._id.toString(),
        name: `${collaborator.first_name} ${collaborator.last_name}`,
        rol: assignment.rol,
        horasAsignadas: assignment.horasAsignadas,
        tecnologias: collaborator.tecnologias,
        seniority: assignment.seniority,
        orderDate: addDays(today, -15),
        startDate: addDays(today, -10),
      };
    });

    projectDocs[project.name] = await upsertOne(
      Project,
      { name: project.name },
      {
        managerId: manager._id.toString(),
        managerName: manager.name,
        managerVisibleInOrgChart: true,
        name: project.name,
        client: project.client,
        status: project.status,
        phase: project.phase,
        projectType: project.projectType,
        assignedPersons,
        startDate: project.startDate,
        endDate: project.endDate,
        description: project.description,
        category: project.category,
        budget: project.budget,
        delete_at: null,
        last_edited_by: "seed:demo",
        last_edited_on: new Date(),
      },
      { setOnInsert: { created_at: new Date() } }
    );
  }

  // Reemplaza las asignaciones del colaborador para mantener consistencia en cada reejecucion.
  const collaboratorAssignments = {};
  for (const collaborator of collaboratorsSeed) {
    collaboratorAssignments[collaborator.email] = [];
  }

  for (const project of projectSeed) {
    const projectDoc = projectDocs[project.name];
    for (const assignment of project.assigned) {
      collaboratorAssignments[assignment.collaboratorEmail].push({
        projectId: projectDoc._id,
        rol: assignment.rol,
        horasAsignadas: assignment.horasAsignadas,
        seniority: assignment.seniority,
        orderDate: addDays(today, -15),
        startDate: addDays(today, -10),
      });
    }
  }

  for (const collaborator of collaboratorsSeed) {
    const assignments = collaboratorAssignments[collaborator.email];
    const totalHours = assignments.reduce((sum, item) => sum + Number(item.horasAsignadas || 0), 0);

    collaboratorDocs[collaborator.email] = await upsertOne(
      Collaborator,
      { email: collaborator.email },
      {
        dni: collaborator.dni,
        first_name: collaborator.first_name,
        last_name: collaborator.last_name,
        email: collaborator.email,
        estado: collaborator.estado,
        tecnologias: collaborator.tecnologias,
        roles: collaborator.roles,
        jornadaId: jornadaDocs[collaborator.jornadaName]._id,
        Proyectos: assignments,
        horasAsignadas: totalHours,
        honorarios: totalHours * 1000,
        start_contrato: collaborator.start_contrato,
        fin_contrato: collaborator.fin_contrato,
        delete_at: null,
        last_edited_by: "seed:demo",
        last_edited_on: new Date(),
      },
      { setOnInsert: { created_at: new Date() } }
    );
  }

  const vacanciesSeed = [
    {
      vacancieName: "Backend Node Senior",
      projectName: "Portal de Tramites Digitales",
      managerEmail: "luis.gomez@rubik.local",
      time: 40,
      orderDate: addDays(today, -5),
      startDate: addDays(today, 10),
      seniority: "Senior",
      status: "Abierta",
      skillNames: ["Node.js", "MongoDB", "Docker"],
      description: "Perfil backend para APIs y performance.",
    },
    {
      vacancieName: "QA Automation Semi Senior",
      projectName: "Plataforma Ecommerce Andina",
      managerEmail: "ana.perez@rubik.local",
      time: 20,
      orderDate: addDays(today, -3),
      startDate: addDays(today, 7),
      seniority: "Semi-Senior",
      status: "En Proceso",
      skillNames: ["Cypress", "JavaScript"],
      description: "Automatizacion E2E y smoke tests.",
    },
    {
      vacancieName: "Data Engineer AWS",
      projectName: "Data Lake Comercial",
      managerEmail: "ana.perez@rubik.local",
      time: 30,
      orderDate: addDays(today, -2),
      startDate: addDays(today, 14),
      seniority: "Senior",
      status: "Abierta",
      skillNames: ["Python", "AWS", "PostgreSQL"],
      description: "Pipelines y modelado para reporting ejecutivo.",
    },
  ];

  for (const vacancy of vacanciesSeed) {
    const manager = userDocs[vacancy.managerEmail];
    const project = projectDocs[vacancy.projectName];
    const skills = vacancy.skillNames.map((name) => ({
      technologyId: technologyDocs[name]._id,
    }));

    await upsertOne(
      Vacancy,
      { vacancieName: vacancy.vacancieName, projectId: project._id },
      {
        manager_id: manager._id.toString(),
        manager_name: manager.name,
        manager_visible_in_org_chart: true,
        projectId: project._id,
        vacancieName: vacancy.vacancieName,
        time: vacancy.time,
        orderDate: vacancy.orderDate,
        startDate: vacancy.startDate,
        seniority: vacancy.seniority,
        status: vacancy.status,
        description: vacancy.description,
        skills,
        delete_at: null,
        last_edited_by: "seed:demo",
        last_edited_on: new Date(),
      },
      { setOnInsert: { created_at: new Date() } }
    );
  }

  const notifications = [
    {
      type: "project",
      referenceId: projectDocs["Portal de Tramites Digitales"]._id.toString(),
      message: 'El proyecto "Portal de Tramites Digitales" vence en 18 dias',
      alertLevel: "warning",
      recipients: ["admin@rubik.local", "luis.gomez@rubik.local"],
      readers: [],
    },
    {
      type: "contract",
      referenceId: collaboratorDocs["martin.quiroga@rubik.local"]._id.toString(),
      message: "El contrato de Martin Quiroga vence en 18 dias",
      alertLevel: "warning",
      recipients: ["admin@rubik.local", "luis.gomez@rubik.local"],
      readers: [{ email: "luis.gomez@rubik.local", readAt: new Date() }],
    },
    {
      type: "info",
      referenceId: projectDocs["Plataforma Ecommerce Andina"]._id.toString(),
      message: "Demo lista con colaboradores, proyectos, vacantes y catalogos cargados",
      alertLevel: "info",
      recipients: ["admin@rubik.local", "ana.perez@rubik.local"],
      readers: [],
    },
  ];

  for (const notification of notifications) {
    await upsertOne(
      Notification,
      {
        type: notification.type,
        referenceId: notification.referenceId,
        message: notification.message,
      },
      {
        alertLevel: notification.alertLevel,
        recipients: notification.recipients,
        readers: notification.readers,
        sentAt: new Date(),
      }
    );
  }
}

async function main() {
  if (!process.env.MONGO_HOST) {
    throw new Error("Falta la variable MONGO_HOST en el entorno.");
  }

  await mongoose.connect(process.env.MONGO_HOST, { serverSelectionTimeoutMS: 5000 });

  try {
    const { jornadaDocs, technologyDocs } = await seedCatalogs();
    const userDocs = await seedUsers();
    await seedDomainData(jornadaDocs, technologyDocs, userDocs);

    const summary = {
      users: await User.countDocuments({ delete_at: null }),
      roles: await Role.countDocuments({}),
      jornadas: await Jornada.countDocuments({}),
      technologies: await Technology.countDocuments({}),
      legacyTechnologies: await LegacyTechnology.countDocuments({}),
      clients: await Client.countDocuments({}),
      states: await StateProject.countDocuments({}),
      collaborators: await Collaborator.countDocuments({ delete_at: null }),
      projects: await Project.countDocuments({ delete_at: null }),
      vacancies: await Vacancy.countDocuments({ delete_at: null }),
      notifications: await Notification.countDocuments({}),
      personnel: await Personnel.countDocuments({}),
    };

    console.log("Seed demo completado.");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      JSON.stringify(
        {
          admin: {
            email: "admin@rubik.local",
            password: "RubikAdmin2026!",
          },
          managers: [
            { email: "ana.perez@rubik.local", password: "RubikManager2026!" },
            { email: "luis.gomez@rubik.local", password: "RubikManager2026!" },
          ],
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  mongoose.disconnect().finally(() => process.exit(1));
});
