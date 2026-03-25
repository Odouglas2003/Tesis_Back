// src/services/bizneoSync.service.js
const { syncFromUsersList, syncOneById } = require("./sync-collaborator.service");
//const { syncAllProjects } = require("./sync-project.service");

/**
 * Sincroniza colaboradores (lista completa/paginada)
 * @param {Object} options
 * @param {number} [options.perPage]
 * @param {number} [options.startPage]
 * @param {number|null} [options.maxPages]
 * @param {number} [options.delayMs]
 * @param {string} [options.projectId]
 * @param {Function} [options.onChange] - callback por cada cambio (created/updated/merged/skipped)
 * @returns {Promise<Object>} resumen { processed, ok, fail, skippedByContract, skippedByEmail }
 */
async function syncCollaborators(options = {}) {
    const {
    onChangeCollab = () => {},
    ...rest
  } = options;
    const collaborators = await syncFromUsersList({ ...rest, onChange: onChangeCollab });
  return { summary: { collaborators} };
}

/**
 * Sincroniza un colaborador puntual por bizneoId
 * @param {string|number} bizneoId
 * @param {Object} [opts]
 * @param {string} [opts.projectId]
 * @param {Function} [opts.onChange] - callback opcional
 */
async function syncOneCollaborator(bizneoId, { projectId, onChange } = {}) {
  return syncOneById(bizneoId, { projectId }, onChange);
}
/**
 * Sincroniza proyectos
 * @param {Object} options
 * @param {Function} [options.onChange] - callback por cada proyecto (created/updated)
 * @returns {Promise<Object>} resumen { success, errors, linked }
 */
/*
async function syncProjects(options = {}) {
  const { onChange, ...rest } = options;
  return syncAllProjects({ ...rest, onChange });
}
*/

/**
 * Full sync: primero colaboradores, luego proyectos.
 * Devuelve un objeto { summary: { collaborators, projects } }
 * para que el controller lo exponga junto con el reporte.
 */
/*
async function runFullSync(options = {}) {
  const {
    onChangeCollab = () => {},
    onChangeProject = () => {},
    ...rest
  } = options;

  const collaborators = await syncFromUsersList({ ...rest, onChange: onChangeCollab });
  const projects = await syncAllProjects({ ...rest, onChange: onChangeProject });

  return { summary: { collaborators, projects } };
}
*/
module.exports = {
  //runFullSync,
  syncCollaborators,
  syncOneCollaborator,
  //syncProjects,
};
