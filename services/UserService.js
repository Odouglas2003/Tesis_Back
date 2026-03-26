


// services/UserService.js (versión COMPLETA y MODIFICADA)
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwtService = require("./jwt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); // <-- NUEVA IMPORTACIÓN

// dotenv.config() ya está en app.js, no se necesita aquí.

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

class UserService {
  constructor() {
    this.baseUrl = process.env.BACKEND_URL;
    this.frontendUrl = process.env.FRONTEND_BASE_URL;
  }

  async getAllUsers() {
    return User.find({ delete_at: null }).select("-password -temporalToken -created_at -delete_at");
  }

  async _sendAdminAuthorizationEmail(userData, authToken) {
    if (!process.env.ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL no está configurado en variables de entorno");
    }

    const mailOptions = {
      from: `Plataforma Rubik <${process.env.MAIL_USERNAME}>`,
      to: process.env.ADMIN_EMAIL,
      subject: "Nueva solicitud de registro de usuario",
      html: `
            <h2>Nueva solicitud de registro</h2>
            <p>Solicitud de registro en la plataforma con los siguientes datos:</p>
            <ul>
                <li>Nombre: ${userData.name}</li>
                <li>Email: ${userData.email}</li>
                <li>Rol: ${userData.rol}</li>
            </ul>
            <p>Por favor, autoriza o rechaza la solicitud:</p>
            <div>
                <a href="${this.baseUrl}/user/authorize/${authToken}/approve" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Aprobar</a>
                <a href="${this.baseUrl}/user/authorize/${authToken}/reject" style="display: inline-block; background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Rechazar</a>
            </div>
        `,
    };
    await transporter.sendMail(mailOptions);
  }

  async registerUser(userData) {
    const existingUser = await User.findOne({
      email: userData.email.toLowerCase(),
      delete_at: null
    });
    if (existingUser) {
      throw new AppError('EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const authToken = crypto.randomBytes(32).toString("hex");

    const userToSave = new User({
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      rol: userData.rol,
      status: "pending",
      temporalToken: authToken,
    });

    try {
      await this._sendAdminAuthorizationEmail(userData, authToken);
    } catch (emailError) {
      logger.error("Error al enviar email de autorización al admin durante el registro:", {
        message: emailError.message,
        stack: emailError.stack,
        userEmail: userData.email
      });
      throw new AppError('EMAIL_SEND_FAIL_ADMIN');
    }

    const savedUser = await userToSave.save();
    const { ...userToReturn } = savedUser.toObject();
    return userToReturn;
  }

  async processAuthorization(token, action) {
    const user = await User.findOne({ temporalToken: token });
    if (!user) {
      throw new AppError('INVALID_AUTH_TOKEN');
    }
    if (user.status !== 'pending') {
      throw new AppError('AUTH_REQUEST_ALREADY_PROCESSED');
    }

    let emailSubject, emailHtml;

    if (action === "approve") {
      user.status = "active";
      emailSubject = "¡Tu registro ha sido aprobado!";
      emailHtml = `<h2>¡Registro Aprobado!</h2><p>Hola ${user.name},</p><p>Tu solicitud de registro ha sido aprobada. Ya puedes acceder al sistema.</p><a href="${this.frontendUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Iniciar Sesión</a>`;
    } else if (action === "reject") {
      user.status = "rejected";
      emailSubject = "Tu solicitud de registro ha sido rechazada";
      emailHtml = `<h2>Registro Rechazado</h2><p>Hola ${user.name},</p><p>Lamentamos informarte que tu solicitud de registro ha sido rechazada.</p>`;
    } else {
      throw new AppError('INVALID_AUTH_ACTION');
    }

    user.temporalToken = undefined;
    await user.save();

    try {
      await transporter.sendMail({
        from: `Plataforma Rubik <${process.env.MAIL_USERNAME}>`,
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (emailError) {
      logger.error(`Error al enviar email de ${action} al usuario ${user.email}:`, {
        message: emailError.message,
        stack: emailError.stack
      });
    }
    return { action };
  }

  async loginUser(email, password) {
    const user = await User.findOne({ email: email.toLowerCase(), delete_at: null });
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    if (user.status === "pending") {
      throw new AppError('ACCOUNT_PENDING_APPROVAL');
    }
    if (user.status === "rejected") {
      throw new AppError('ACCOUNT_REJECTED');
    }
    if (user.status !== "active") {
      throw new AppError('ACCOUNT_STATUS_LOGIN_FORBIDDEN');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    const token = jwtService.createToken(user);
    const { ...userWithoutSensitiveData } = user.toObject();

    return { user: userWithoutSensitiveData, token };
  }

  async updateUserByEmail(email, updateData) {
    const allowedUpdates = {};



    if (Object.prototype.hasOwnProperty.call(updateData, 'rol')) allowedUpdates.rol = updateData.rol;
    if (Object.prototype.hasOwnProperty.call(updateData, 'status')) allowedUpdates.status = updateData.status;
    if (Object.prototype.hasOwnProperty.call(updateData, 'name')) allowedUpdates.name = updateData.name;

    delete allowedUpdates.email;
    delete allowedUpdates.password;
    delete allowedUpdates.temporalToken;

    if (Object.keys(allowedUpdates).length === 0) {
      throw new AppError('NO_VALID_UPDATE_DATA');
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase(), delete_at: null },
      allowedUpdates,
      { new: true, runValidators: true }
    ).select("-password -temporalToken -delete_at -created_at");

    if (!updatedUser) {
      throw new AppError('USER_NOT_FOUND');
    }
    return updatedUser;
  }

  async requestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase(), delete_at: null });
    if (!user) {
      logger.warn(`Intento de reseteo de contraseña para email no existente o borrado: ${email}`);
      throw new AppError('USER_NOT_FOUND_FOR_RESET'); // Error interno, no para el cliente
    }

    if (user.status !== 'active') {
      throw new AppError('ACCOUNT_STATUS_NO_RESET');
    }

    const resetLink = `${this.frontendUrl}/pages/reset_password?email=${encodeURIComponent(user.email)}`;

    try {
      await transporter.sendMail({
        from: `Plataforma Rubik <${process.env.MAIL_USERNAME}>`,
        to: user.email,
        subject: "Restablecer tu contraseña",
        html: `<p>Hola ${user.name},</p><p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p><p>Haz clic en el siguiente botón para cambiar tu contraseña:</p><a href="${resetLink}" style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Cambiar Contraseña</a><p>Si no solicitaste un cambio de contraseña, puedes ignorar este correo.</p>`,
      });
    } catch (emailError) {
      logger.error("Error al enviar email de recuperación de contraseña:", {
        message: emailError.message,
        stack: emailError.stack,
        userEmail: user.email
      });
      throw new AppError('EMAIL_SEND_FAIL_RECOVERY');
    }
    return { message: "Email de solicitud de reseteo enviado." };
  }

  async resetUserPassword(email, newPassword) {
    const user = await User.findOne({ email: email.toLowerCase(), delete_at: null });
    if (!user) {
      throw new AppError('USER_NOT_FOUND');
    }
    if (user.status !== 'active') {
      throw new AppError('ACCOUNT_STATUS_NO_UPDATE');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return { message: "Contraseña actualizada con éxito." };
  }

  async deleteUserByEmail(email) {
    const result = await User.deleteOne({ email: email.toLowerCase() });
    if (result.deletedCount === 0) {
      throw new AppError('USER_NOT_FOUND');
    }
    return;
  }
}

module.exports = new UserService();
