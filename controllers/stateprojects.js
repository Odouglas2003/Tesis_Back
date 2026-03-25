const stateprojectsService = require("../services/stateprojectsService");
//const logger = require("../config/logger");



const getAllStates = async (req, res, next) => {
  try {
    const states = await stateprojectsService.getAllStates();
    res.status(200).json(states);
  } catch (err) {
    next(err);
  }
};


module.exports = {

  getAllStates,

};
