const BrandConfig = require('../models/brandConfig');

class BrandConfigService {
  async createBrandConfig(data) {
    const brand = new BrandConfig(data);
    return brand.save();
  }

  async getAllBrandConfigs() {
    return BrandConfig.find();
  }

  async getBrandConfigById(id) {
    return BrandConfig.findById(id);
  }

  async updateBrandConfig(id, data) {
    return BrandConfig.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async getBrandConfigsByEmpresa(empresaId) {
    return BrandConfig.find({ empresaId });
  }



  async deleteBrandConfig(id) {
    return BrandConfig.findByIdAndDelete(id);
  }
}

module.exports = new BrandConfigService();