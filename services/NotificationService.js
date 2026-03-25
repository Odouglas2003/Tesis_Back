// services/NotificationService.js
const Colab = require("../models/collaborator");
const Project = require("../models/projects");
const Notification = require("../models/notification");
const User = require("../models/user");
//const logger = require("../config/logger");

class NotificationService {
  // Utilidad para obtener administradores
  async getAdministrators() {
    return User.find({
      rol: "administrador",
      delete_at: null,
      email: { $ne: null },
    }).lean();
  }

  // Utilidad para obtener managers de proyectos
  async getManagersByProjectNames(projectNames) {
    const relatedProjects = await Project.find({
      name: { $in: projectNames },
      delete_at: null,
      managerName: { $exists: true, $ne: [null, ""] },
    }).lean();

    const managerNames = [
      ...new Set(relatedProjects.map((p) => p.managerName).filter(Boolean)),
    ];
    if (managerNames.length === 0) return [];

    return User.find({
      name: { $in: managerNames },
      rol: "manager",
      delete_at: null,
      email: { $ne: null },
    }).lean();
  }

  // Crea la notificación si no existe
  async createNotificationIfNotExists({
    type,
    referenceId,
    message,
    alertLevel,
    recipients,
  }) {
    if (!recipients || recipients.length === 0) return;

    const existingNotif = await Notification.findOne({
      type,
      referenceId,
      message,
      alertLevel,
    });

    if (!existingNotif) {
      await Notification.create({
        type,
        referenceId,
        message,
        alertLevel,
        recipients,
        sentAt: new Date(),
        readers: [],
      });
    }
  }

  // Lógica para contratos
  async checkContractExpiration() {
    const allColabs = await Colab.find({
      delete_at: null,
      "Fin de Contrato": { $ne: null },
    }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const colab of allColabs) {
      const contractEnd = new Date(colab["Fin de Contrato"]);
      contractEnd.setHours(0, 0, 0, 0);

      const diffTime = contractEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        const alertLevel = diffDays <= 0 ? "expired" : "warning";
        const message =
          diffDays <= 0
            ? `El contrato de ${colab.first_name} ${colab.last_name} está vencido`
            : `El contrato de ${colab.first_name} ${colab.last_name} vence en ${diffDays} días`;

        let recipients = [];

        // Administradores
        const administrators = await this.getAdministrators();
        administrators.forEach((admin) => {
          recipients.push(admin.email);
        });

        // Managers de los proyectos del colaborador
        if (
          colab.Proyectos &&
          Array.isArray(colab.Proyectos) &&
          colab.Proyectos.length > 0
        ) {
          const projectNames = colab.Proyectos.filter(
            (proyecto) => proyecto && proyecto.Proyectos
          ).map((proyecto) => proyecto.Proyectos);

          if (projectNames.length > 0) {
            const projectManagers = await this.getManagersByProjectNames(
              projectNames
            );
            projectManagers.forEach((manager) => {
              if (!recipients.includes(manager.email)) {
                recipients.push(manager.email);
              }
            });
          }
        }

        recipients = recipients.filter(Boolean); // Eliminar nulos

        await this.createNotificationIfNotExists({
          type: "contract",
          referenceId: colab.id.toString(),
          message,
          alertLevel,
          recipients,
        });
      }
    }
    return { message: "Contratos verificados y notificaciones generadas" };
  }

  // Lógica para proyectos
  async checkProjectExpiration() {
    const allProjects = await Project.find({
      delete_at: null,
      endDate: { $ne: null },
    }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const projec of allProjects) {
      const projectEnd = new Date(projec.endDate);
      projectEnd.setHours(0, 0, 0, 0);

      const diffTime = projectEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        const alertLevel = diffDays <= 0 ? "expired" : "warning";
        const message =
          diffDays <= 0
            ? `El proyecto "${projec.name}" ha vencido`
            : `El proyecto "${projec.name}" vence en ${diffDays} días`;

        let recipients = [];

        // Administradores
        const administrators = await this.getAdministrators();
        administrators.forEach((admin) => {
          recipients.push(admin.email);
        });

        // Manager del proyecto
        if (projec.managerName) {
          const projectManager = await User.findOne({
            name: projec.managerName,
            rol: "manager",
            delete_at: null,
            email: { $ne: null },
          }).lean();

          if (projectManager && !recipients.includes(projectManager.email)) {
            recipients.push(projectManager.email);
          }
        }

        recipients = recipients.filter(Boolean);

        await this.createNotificationIfNotExists({
          type: "project",
          referenceId: projec._id.toString(),
          message,
          alertLevel,
          recipients,
        });
      }
    }
    return { message: "Proyectos verificados y notificaciones generadas" };
  }

  async getNotificationsOrdered(order = "newest") {
    let sortOrder = -1;
    if (order === "oldest") sortOrder = 1;
    if (order === "newest") sortOrder = -1;

    return Notification.find().sort({ sentAt: sortOrder });
  }
}

module.exports = new NotificationService();
