const express = require("express");
const router = express.Router();
const NotiController = require("../controllers/notification");
const auth = require("../middlewares/auth");

router.get("/notiContracts",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], NotiController.checkContractExpiration);

router.get("/notiProjects",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], NotiController.checkProjectExpiration);

router.post("/markAsRead", [auth.ensureAuth, auth.hasRole(['administrador','manager'])],NotiController.markNotificationAsRead);

router.post("/markAllAsRead",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], NotiController.markAllNotificationsAsRead);

router.get("/byUser/:email", [auth.ensureAuth, auth.hasRole(['administrador','manager'])],NotiController.getNotificationsByUser);

router.get("/byManager", [auth.ensureAuth, auth.hasRole(['administrador','manager'])],NotiController.getNotificationsByManager);

router.get("/all",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], NotiController.getAllNotifications);

router.get("/ordered",[auth.ensureAuth, auth.hasRole(['administrador','manager'])], NotiController.getNotificationsOrdered);
module.exports = router;
