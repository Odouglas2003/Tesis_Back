const svc = require("../services/collaborator.history.service");

const recordDailyHistory = async (req, res, next) => {
  try {
    const collaboratorId = req.params.id;
    const { previous = [], next: nextArr = [], userId, dateKey } = req.body;
    const changedBy = (req.user && req.user._id) || userId || null;

    const out = await svc.createChangeBlock({
      collaboratorId,
      previous,
      next: nextArr,
      userId: changedBy,
      dateKey,
    });

    res.json(out);
  } catch (err) {
    next(err);
  }
};

const getAssignmentHistoryBlocks = async (req, res, next) => {
  try {
    const collaboratorId = req.params.id;
    const out = await svc.getBlocks({ collaboratorId });
    res.status(200).json(out);
  } catch (e) {
    next(e);
  }
};

module.exports = { recordDailyHistory, getAssignmentHistoryBlocks };
