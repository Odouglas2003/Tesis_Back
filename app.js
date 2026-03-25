

'use strict'

require("dotenv").config();
require('express-async-errors');

const express = require("express");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const logger = require('./config/logger');
const AppError = require('./utils/AppError');
const messages = require('./utils/messages');
const auth=require('./middlewares/auth');
const app = express();
const swaggerFinalDocument = require('./docs/swagger.json');



const developmentOrigins = ['http://localhost:3000'];


const productionOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];


let allowedOrigins;

if (process.env.NODE_ENV !== 'production') {
  
  allowedOrigins = [...new Set([...developmentOrigins, ...productionOrigins])];
  
} else {
  
  allowedOrigins = productionOrigins;
  
}

const corsOptions = {
  origin: (origin, callback) => {
   
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      callback(new Error(msg));
    }
  },
  credentials: true,
};

// Aplicar CORS
app.use(cors(corsOptions));


app.options('*', cors(corsOptions));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs',[auth.ensureAuth, auth.hasRole(['administrador'])],swaggerUi.serve, swaggerUi.setup(swaggerFinalDocument));
app.use((req, res, next) => {
    const startTime = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(startTime);
        const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - IP: ${req.ip}`);
    });
    next();
});


app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Service is running'
  });
});


const UserRuter = require("./routes/user");
const ColaboRuter = require("./routes/collaborator");
const ProjecRuter = require("./routes/projects");
const TecnnoRuter = require("./routes/tecnology");
const VacanRuter = require("./routes/vacancy");
const ConfigRuter = require("./routes/configuration");  
const NotifRuter = require("./routes/notification");
const BasicFieldRouter = require("./routes/basicFieldRoutes");
const ExtraFieldRouter = require("./routes/extraFieldRoutes");
const PersonnelRouter = require("./routes/personnelRoutes");
const stateprojectsRouter = require("./routes/stateprojects.js");
const technologies = require("./routes/technologies.js");
const iaRoutes = require("./routes/iaRoutes");
const jornadaRoutes = require("./routes/jornadaRoutes.js");
const rolesRoutes = require("./routes/rolesRoutes.js");
const uploadRoutes = require("./routes/upload.routes.js");
const dashboardRoutes = require('./routes/dashboard.routes');
const clientRoutes = require('./routes/clientRoutes.js');
const skillsRoutes = require('./routes/skillsRoutes.js');
const iaMetricsRoutes = require('./routes/iaMetrics.js');
const brandConfigRoutes = require('./routes/brandConfigRoutes');
const syncBizneo = require('./routes/bizneoSync.routes.js')
const historyColaboradorRoutes = require("./routes/historycolaborador.js");

app.use("/api/user", UserRuter);
app.use("/api/collaborator", ColaboRuter);
app.use("/api/projects", ProjecRuter);
app.use("/api/technology", TecnnoRuter);
app.use("/api/vacancie", VacanRuter);
app.use("/api/configuration", ConfigRuter);
app.use("/api/roles", rolesRoutes);
app.use("/api/notification", NotifRuter);
app.use("/api/stateprojects", stateprojectsRouter);
app.use("/api/basic-fields", BasicFieldRouter);
app.use("/api/extra-fields", ExtraFieldRouter);
app.use("/api/personnel", PersonnelRouter);
app.use("/api/technologies", technologies);
app.use("/api/ia", iaRoutes);
app.use("/api/jornadas", jornadaRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api', iaMetricsRoutes);
app.use('/api/brand-config', brandConfigRoutes);
app.use('/api/sync/bizneo', syncBizneo);
app.use("/api/history-colaborador", historyColaboradorRoutes);

// Ruta de prueba
app.get("/ruta-prueba",[auth.ensureAuth, auth.hasRole(['administrador'])], (req, res) => {
    logger.info("Acceso a /ruta-prueba");
    return res.status(200).json({ message: "La API REST funciona correctamente" });
});


app.use((err, req, res,next) => {
    if (err instanceof AppError) {
        logger.warn(`${err.statusCode} - ${err.message} - [Key: ${err.key}] - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        return res.status(err.statusCode).json({
            status: 'fail',
            message: err.message
        });  
    }
    logger.error(`${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip} - Stack: ${err.stack}`);
    const responseMessage = process.env.NODE_ENV === 'production'
        ? messages.error.INTERNAL_SERVER_ERROR.message
        : err.message;
    return res.status(500).json({
        status: 'error',
        message: responseMessage
    });  
});


module.exports = app;