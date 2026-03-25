// /config/messages.js

const messages = {
    error: {
        // --- Errores Generales y del Servidor ---
        INTERNAL_SERVER_ERROR: { statusCode: 500, message: "Ocurrió un error inesperado en el servidor. Por favor, contacta al soporte." },
        UNAUTHORIZED: { statusCode: 403, message: "No tienes autorización para realizar esta acción." },
        INVALID_ROUTE: { statusCode: 404, message: "La ruta solicitada no existe." },

        // --- Errores de Autenticación y Usuarios ---
        MISSING_LOGIN_CREDENTIALS: { statusCode: 400, message: "Faltan el correo electrónico o la contraseña." },
        MISSING_REGISTER_DATA: { statusCode: 400, message: "Faltan datos requeridos para el registro (nombre, email, contraseña, rol)." },
        MISSING_EMAIL_FOR_RESET: { statusCode: 400, message: "El correo electrónico es requerido para solicitar el reseteo de contraseña." },
        MISSING_RESET_DATA: { statusCode: 400, message: "Faltan datos para el reseteo de contraseña (email, nueva contraseña, confirmación)." },
        PASSWORDS_DO_NOT_MATCH: { statusCode: 400, message: "Las contraseñas no coinciden." },
        MISSING_EMAIL_IN_URL: { statusCode: 400, message: "El correo electrónico es requerido en la URL para esta operación." },
        
        // --- Errores de Lógica de Negocio (Servicio de Usuario) ---
        EMAIL_ALREADY_EXISTS: { statusCode: 409, message: "El correo electrónico ya está registrado." },
        EMAIL_SEND_FAIL_ADMIN: { statusCode: 500, message: "Se produjo un error al intentar enviar el email de verificación al administrador." },
        EMAIL_SEND_FAIL_RECOVERY: { statusCode: 500, message: "No se pudo enviar el email de recuperación. Por favor, intenta de nuevo más tarde." },
        INVALID_AUTH_TOKEN: { statusCode: 410, message: "La solicitud de autorización ya fue procesada, es inválida o el token ha expirado." },
        AUTH_REQUEST_ALREADY_PROCESSED: { statusCode: 409, message: "Esta solicitud de autorización ya fue procesada." },
        INVALID_AUTH_ACTION: { statusCode: 400, message: "La acción de autorización no es válida. Debe ser 'approve' o 'reject'." },
        INVALID_CREDENTIALS: { statusCode: 401, message: "Las credenciales proporcionadas son inválidas." },
        ACCOUNT_PENDING_APPROVAL: { statusCode: 403, message: "Tu cuenta está pendiente de aprobación por un administrador." },
        ACCOUNT_REJECTED: { statusCode: 403, message: "Tu cuenta ha sido rechazada. Por favor, contacta al soporte." },
        ACCOUNT_STATUS_LOGIN_FORBIDDEN: { statusCode: 403, message: "El estado actual de tu cuenta no permite el inicio de sesión." },
        ACCOUNT_STATUS_NO_RESET: { statusCode: 403, message: "La cuenta no está activa y no se puede restablecer la contraseña." },
        ACCOUNT_STATUS_NO_UPDATE: { statusCode: 403, message: "La cuenta no está activa y no se puede modificar." },
        NO_VALID_UPDATE_DATA: { statusCode: 400, message: "No se proporcionaron datos válidos para actualizar." },
        USER_NOT_FOUND: { statusCode: 404, message: "El usuario no fue encontrado." },
        USER_NOT_FOUND_FOR_RESET: { statusCode: 404, message: "Usuario no encontrado para reseteo de contraseña." },
        
        // --- Errores de Colaborador ---
        COLLABORATOR_NOT_FOUND: { statusCode: 404, message: "El colaborador no fue encontrado o ha sido eliminado." },
        DNI_ALREADY_EXISTS: { statusCode: 409, message: "Ya existe un colaborador con el DNI proporcionado." },
        EMAIL_ALREADY_EXISTS_COLLABORATOR: { statusCode: 409, message: "Ya existe un colaborador con el correo electrónico proporcionado." },
        MISSING_PROJECT_ID: { statusCode: 400, message: "Se requiere el ID del proyecto ('projectId') en el cuerpo de la petición." },

        // --- Errores de Proyecto ---
        PROJECT_NOT_FOUND: { statusCode: 404, message: "El proyecto no fue encontrado o ya ha sido eliminado." },
        PROJECT_NAME_ALREADY_EXISTS: { statusCode: 409, message: "Ya existe un proyecto activo con el nombre proporcionado." },

        // --- Errores de Vacante ---
        VACANCY_NOT_FOUND: { statusCode: 404, message: "La vacante no fue encontrada o ya ha sido eliminada." },
        VACANCY_ALREADY_DELETED: { statusCode: 400, message: "La vacante ya fue eliminada previamente." },
        VACANCY_PROJECT_NOT_FOUND: { statusCode: 404, message: "El proyecto asociado a la vacante no existe." },

        // --- Errores de Tecnología ---
        TECH_MISSING_FIELDS: { statusCode: 400, message: "Faltan los campos 'id' o 'name' para crear la tecnología." },
        TECH_MISSING_NAME: { statusCode: 400, message: "Falta el campo 'name' para actualizar la tecnología." },
        TECH_NOT_FOUND: { statusCode: 404, message: "La tecnología no fue encontrada." },
        TECH_ID_ALREADY_EXISTS: { statusCode: 409, message: "Ya existe una tecnología con el mismo ID." },

        // --- Errores de Roles ---
        ROLE_MISSING_FIELDS: { statusCode: 400, message: "El nombre y la descripción del rol son requeridos." },
        ROLE_NAME_ALREADY_EXISTS: { statusCode: 409, message: "Ya existe un rol con el mismo nombre." },
        ROLE_NOT_FOUND: { statusCode: 404, message: "El rol no fue encontrado." },
        ROLE_NO_UPDATE_DATA: { statusCode: 400, message: "Debes proporcionar al menos un campo para actualizar el rol." },

        // --- Errores de Subida de Archivos (Multer) ---
        NO_FILE_UPLOADED: { statusCode: 400, message: "No se subió ningún archivo." },
        FILE_TOO_LARGE: { statusCode: 400, message: "El archivo es demasiado grande. El límite es 5MB." },
        UNEXPECTED_FILE_FIELD: { statusCode: 400, message: "Campo de archivo inesperado o demasiados archivos." },
        INVALID_FILE_TYPE: { statusCode: 400, message: "Tipo de archivo no permitido. Solo se aceptan imágenes (jpeg, png, gif)." },
        MULTER_GENERIC_ERROR: { statusCode: 400, message: "Ocurrió un error al subir el archivo." },
    },
    success: {
        // --- Mensajes de Éxito de Usuario ---
        LOGIN_SUCCESS: "Usuario logueado correctamente.",
        REGISTER_REQUEST_SUCCESS: "Solicitud de registro enviada. Pendiente de autorización.",
        USER_UPDATED: "Usuario actualizado correctamente.",
        USER_DELETED: "Usuario eliminado correctamente.",
        PASSWORD_RESET_REQUEST_SUCCESS: "Si tu correo está registrado y activo, recibirás un email con instrucciones.",
        PASSWORD_RESET_SUCCESS: "Contraseña actualizada con éxito.",
        AUTH_PROCESSED: (action) => `Usuario ${action === 'approve' ? 'aprobado' : 'rechazado'}. Puede cerrar esta ventana.`,
        PROFILE_IMAGE_UPLOADED: "Imagen de perfil subida exitosamente.",

        // --- Mensajes de Éxito de Colaborador ---
        COLLABORATOR_REGISTERED: "Colaborador registrado correctamente.",
        COLLABORATOR_UPDATED: "Colaborador actualizado correctamente.",
        COLLABORATOR_DELETED: "Colaborador eliminado correctamente.",
        CONTRACT_EXPIRATION_CHECK_PENDING: "Función de expiración de contratos pendiente de implementación.",
        PROJECT_REMOVAL_PENDING: (projectId, collaboratorId) => `Función para remover proyecto ${projectId} del colaborador ${collaboratorId} pendiente.`,
        
        // --- Mensajes de Éxito de Proyecto ---
        PROJECT_REGISTERED: "Proyecto registrado exitosamente.",
        PROJECT_UPDATED: "Proyecto actualizado correctamente.",
        PROJECT_DELETED: "Proyecto y sus vacantes activas han sido eliminados correctamente.",
        PERSON_ASSIGNED: "Persona asignada al proyecto correctamente.",
        PERSON_REMOVED: "Persona eliminada del proyecto correctamente.",
        PERSON_UPDATED: "Persona asignada actualizada correctamente.",

        // --- Mensajes de Éxito de Vacante ---
        VACANCY_REGISTERED: "Vacante registrada correctamente.",
        VACANCY_UPDATED: "Vacante actualizada correctamente.",
        VACANCY_DELETED: "Vacante eliminada correctamente.",

        // --- Mensajes de Éxito de Tecnología ---
        TECH_ADDED: "Tecnología agregada correctamente.",
        TECH_UPDATED: "Tecnología actualizada correctamente.",
        TECH_DELETED: "Tecnología eliminada correctamente.",

        // --- Mensajes de Éxito de Roles ---
        ROLE_CREATED: "Rol creado correctamente.",
        ROLE_UPDATED: "Rol actualizado correctamente.",
        ROLE_DELETED: "Rol eliminado correctamente.",
    }
};

module.exports = messages;