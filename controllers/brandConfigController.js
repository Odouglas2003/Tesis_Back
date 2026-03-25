const BrandConfigService = require('../services/brandConfigService');
const { uploadFile, getPublicUrl } = require('../services/s3.service');

const createBrandConfig = async (req, res) => {
  let data = req.body;
  if (typeof req.body.data === 'string') {
    try { data = JSON.parse(req.body.data); } catch (_) { /* ignorar */ }
  }

  if (req.files) {
    if (req.files.logo && req.files.logo[0]) {
      const file = req.files.logo[0];
      const { key } = await uploadFile(file.buffer, file.originalname, file.mimetype);
      data.logo = getPublicUrl(key);
    }
    if (req.files.favicon && req.files.favicon[0]) {
      const fileFav = req.files.favicon[0];
      const { key } = await uploadFile(fileFav.buffer, fileFav.originalname, fileFav.mimetype);
      data.favicon = getPublicUrl(key);
    }
  }

  const brand = await BrandConfigService.createBrandConfig(data);
  res.status(201).json({ status: 'success', brand });
};

const getAllBrandConfigs = async (req, res) => {
  const brands = await BrandConfigService.getAllBrandConfigs();
  res.status(200).json({ status: 'success', brands });
};

const getBrandConfigById = async (req, res) => {
  const { id } = req.params;
  const brand = await BrandConfigService.getBrandConfigById(id);
  if (!brand) return res.status(404).json({ status: 'error', message: 'No encontrado' });
  res.status(200).json({ status: 'success', brand });
};

const updateBrandConfig = async (req, res) => {
  const { id } = req.params;
  let data = req.body;
  if (typeof req.body.data === 'string') {
    try { data = JSON.parse(req.body.data); } catch (_) { /* noop */ }
  }

  if (req.files) {
    if (req.files.logo && req.files.logo[0]) {
      const file = req.files.logo[0];
      const { key } = await uploadFile(file.buffer, file.originalname, file.mimetype);
      data.logo = getPublicUrl(key);
    }
    if (req.files.favicon && req.files.favicon[0]) {
      const fileFav = req.files.favicon[0];
      const { key } = await uploadFile(fileFav.buffer, fileFav.originalname, fileFav.mimetype);
      data.favicon = getPublicUrl(key);
    }
  }

  const brand = await BrandConfigService.updateBrandConfig(id, data);
  if (!brand) return res.status(404).json({ status: 'error', message: 'No encontrado' });
  res.status(200).json({ status: 'success', brand });
};

const getBrandConfigsByEmpresa = async (req, res) => {
  const { empresaId } = req.params;
  const brands = await BrandConfigService.getBrandConfigsByEmpresa(empresaId);
  res.status(200).json({ status: 'success', brands });
};

const deleteBrandConfig = async (req, res) => {
  const { id } = req.params;
  const brand = await BrandConfigService.deleteBrandConfig(id);
  if (!brand) return res.status(404).json({ status: 'error', message: 'No encontrado' });
  res.status(200).json({ status: 'success', message: 'Eliminado' });
};

module.exports = {
  createBrandConfig,
  getAllBrandConfigs,
  getBrandConfigById,
  getBrandConfigsByEmpresa,
  updateBrandConfig,
  deleteBrandConfig,
};
