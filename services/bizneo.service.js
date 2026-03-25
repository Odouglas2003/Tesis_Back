
const axios = require("axios");
const logger = require("../config/logger"); 
const bizneo = axios.create({
  baseURL: process.env.BIZNEO_BASE_URL || "https://mindfactory.bizneohr.com/api/v1",
  timeout: 55000,
});


bizneo.interceptors.request.use((config) => {
  const token = process.env.BIZNEO_TOKEN || process.env.API_TOKEN;
  if (!token) throw new Error("Falta BIZNEO_TOKEN en .env");
  config.headers = { ...(config.headers || {}), Accept: "application/json" };

  const url = new URL(config.url, config.baseURL);
  url.searchParams.set("token", token);
  if (config.params) {
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    delete config.params;
  }
  config.url = url.pathname + url.search;
  return config;
});


const BIZNEO_PROJECTS_TAXONOMY_ID = 15578596; 

const BIZNEO_PUBLIC_SECTOR_ID = 15719827;
const BIZNEO_PRIVATE_SECTOR_ID = 15719828;



function pickArray(data) {
  if (Array.isArray(data)) return data;
  return data?.users || data?.data || data?.results || [];
}

async function listUsersPage(page = 1, perPage = 50) {
  const res = await bizneo.get("/users", { params: { page, per_page: perPage } });
  if (res.status !== 200) throw new Error(`Lista: HTTP ${res.status} -> ${JSON.stringify(res.data)}`);

  const items = pickArray(res.data)
    .map(u => ({
      id: Number(u.id),        
      email: u.email || null,
      first_name: (u.first_name || "").trim(),
      last_name: (u.last_name || "").trim(),
    }))
    .filter(x => Number.isFinite(x.id));

  const meta = {
    page,
    perPage,
    totalPages: res.data?.pagination?.total_pages ?? null,
    total: res.data?.pagination?.total_entries ?? null,
  };
  return { items, meta };
}

async function getUserById(userId) {
  const res = await bizneo.get(`/users/${userId}`);
  if (res.status !== 200) throw new Error(`User ${userId}: HTTP ${res.status} -> ${JSON.stringify(res.data)}`);
  return res.data.user ?? res.data;
}


/**
 
 * @param {string} path 
 * @param {string} dataKey 
 * @returns {Array} 
 */
async function fetchAllPaginatedData(path, dataKey) {
    let allData = [];
    let page = 1;
    let totalPages = 1;

    do {
        try {
            const response = await bizneo.get(path, {
                params: {
                    page,
                    token: process.env.BIZNEO_TOKEN
                }
            });

            const { pagination, [dataKey]: data } = response.data;

            if (data && data.length > 0) {
                allData = allData.concat(data);
            } else {
                break;
            }

            totalPages = pagination.total_pages;
            page++;

        } catch (error) {
            const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`Error obteniendo la página ${page} de ${path}:`, errorMessage);
            throw error;
        }
    } while (page <= totalPages);

    return allData;
}

async function getTaxonById(taxonId) {
    try {
        const response = await bizneo.get(`/taxons/${taxonId}`);
        return response.data.taxon;
    } catch (error) {
        logger.error(`[Bizneo API] Error al obtener Taxon ${taxonId}: ${error.message}`);
        throw error;
    }
}


async function createTaxon(taxonName, parentId) {
    const taxonData = {
        name: taxonName,
        taxonomy_id: BIZNEO_PROJECTS_TAXONOMY_ID,
        parent_id: Number(parentId)
    };
    try {
        const response = await bizneo.post('/taxons', { taxon: taxonData });
        logger.info(`[Bizneo API] Taxon '${taxonName}' creado con éxito. ID: ${response.data.taxon.id}`);
        return response.data.taxon;
    } catch (error) {
        logger.error(`[Bizneo API] Error al crear taxon '${taxonName}': ${error.message}`);
        throw error;
    }
}


 
async function assignUsersToTaxon(bizneoTaxonId, userIds) {
    const employeesPayload = userIds.map(id => ({
        user_id: Number(id),
        visible_in_org_chart: true
    }));
    try {
        const response = await bizneo.put(`/taxons/${bizneoTaxonId}`, {
            taxon: {
                taxon_head_employees: employeesPayload
            }
        });
        logger.info(`[Bizneo API] Miembros del Taxon ${bizneoTaxonId} actualizados.`);
        return response.data.taxon;
    } catch (error) {
        logger.error(`[Bizneo API] Error al asignar usuarios al Taxon ${bizneoTaxonId}: ${error.message}`);
        throw error;
    }
}




module.exports = { 
   listUsersPage,
   getUserById, 
   fetchAllPaginatedData, 
   getTaxonById,
   createTaxon,
   assignUsersToTaxon,
   BIZNEO_PUBLIC_SECTOR_ID,
   BIZNEO_PRIVATE_SECTOR_ID
   };
