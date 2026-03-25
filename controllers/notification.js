const NotificationModel= require("../models/notification");
const NotificationService = require("../services/NotificationService");
const User = require("../models/user");
const checkContractExpiration = async (req, res, next) => {
  try {
    const result = await NotificationService.checkContractExpiration();
    res.status(200).json({ status: "success", ...result });
  } catch (error) {
    next(error);
  }
};

const checkProjectExpiration = async (req, res, next) => {
  try {
    const result = await NotificationService.checkProjectExpiration();
    res.status(200).json({ status: "success", ...result });
  } catch (error) {
    next(error);
  }
};

const getAllNotifications = async (req, res) => {
  const notifs = await NotificationModel.find().sort({ sentAt: -1 }); 
  return res.status(200).json({
    status: "success",
    data: notifs,
  });
};


const getNotificationsByManager = async (req, res) => {
  let emails = req.query.emails;
  if (!emails) {
    return res.status(400).json({
      status: "error",
      message: "Falta el parámetro 'emails' (uno o varios separados por coma)",
    });
  }

  const emailList = emails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e);

  if (emailList.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "El parámetro 'emails' está vacío o mal formado",
    });
  }

  const notifs = await NotificationModel.find();

  const data = await Promise.all(
    notifs.map(async (n) => {
      const relevantRecipients = (n.recipients || []).filter(email => emailList.includes(email));
      const readEmails = (n.readers || []).map(r => r.email);
      const notReadEmails = relevantRecipients.filter(email => !readEmails.includes(email));

      let notRead = [];
      if (notReadEmails.length > 0) {
        const users = await User.find({ email: { $in: notReadEmails } });
        notRead = notReadEmails.map(email => {
          const user = users.find(u => u.email === email);
          return {
            email,
            name: user ? `${user.first_name} ${user.last_name}` : null
          };
        });
      }

      return {
        _id: n._id,
        message: n.message,
        sentAt: n.sentAt,
        readers: n.readers,
        recipientsNotRead: notRead 
      };
    })
  );

  return res.status(200).json({
    status: "success",
    data,
  });
};

const markNotificationAsRead = async (req, res) => {
  const { email, referenceId, type } = req.body;
  if (!email || !referenceId || !type) {
    return res
      .status(400)
      .json({ status: "error", message: "Faltan parámetros" });
  }

  const notif = await NotificationModel.findOne({ referenceId, type, recipients: email });
  if (!notif) {
    return res
      .status(404)
      .json({ status: "error", message: "Notificación no encontrada" });
  }

  const readerIndex = notif.readers.findIndex((r) => r.email === email);
  if (readerIndex !== -1) {
    notif.readers[readerIndex].readAt = new Date();
  } else {
    notif.readers.push({ email, readAt: new Date() });
  }
  await notif.save();

  return res
    .status(200)
    .json({ status: "success", message: "Marcada como leída" });
};

const markAllNotificationsAsRead = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res
      .status(400)
      .json({ status: "error", message: "Falta el email" });
  }

  const notifs = await NotificationModel.find({ recipients: email });

  for (const notif of notifs) {
    const readerIndex = notif.readers.findIndex((r) => r.email === email);
    if (readerIndex !== -1) {
      notif.readers[readerIndex].readAt = new Date();
    } else {
      notif.readers.push({
        email,
        readAt: new Date(),
      });
    }
    await notif.save();
  }

  return res
    .status(200)
    .json({ status: "success", message: "Todas marcadas como leídas" });
};

const getNotificationsByUser = async (req, res,next) => {
  
  try{
  const email = (req.params.email || "").trim().toLowerCase();
  

  if (!email) {
    return res.status(400).json({ status: "error", message: "Falta el email" });
  }
  

  const notifs = await NotificationModel.find({
    recipients: email,
    "readers.email": { $ne: email }
  });
 
  const result = notifs.map(n => ({
    _id: n._id,
    type: n.type,
    referenceId: n.referenceId,
    message: n.message,
    alertLevel: n.alertLevel,
    sentAt: n.sentAt,
    read: false
  }));
 
  return res.status(200).json({
    status: "success",
    data: result,
  });
  }catch (error) {
    next(error);
  }
}

const getNotificationsOrdered = async (req, res) => {
  const order = req.query.order || "newest";
  const notifs = await NotificationService.getNotificationsOrdered(order);
  return res.status(200).json({
    status: "success",
    data: notifs,
  });
};

module.exports = {
  checkContractExpiration,
  checkProjectExpiration,
  getNotificationsByManager,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAllNotifications,
  getNotificationsByUser,
  getNotificationsOrdered,
};
