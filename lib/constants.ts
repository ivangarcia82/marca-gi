// Constantes de dominio compartidas por toda la app.

export const ROLES = {
  ADMIN: "ADMIN",
  EMPLEADO: "EMPLEADO",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ESTADOS = {
  PENDIENTE: "PENDIENTE",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
} as const;

export type Estado = (typeof ESTADOS)[keyof typeof ESTADOS];

export const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  SIN_SUBIR: "Sin subir",
};

// Categorías con las que se siembra la base la primera vez.
export const CATEGORIAS_INICIALES = [
  {
    nombre: "Fondo de Teams",
    descripcion: "Captura de tu fondo virtual en Microsoft Teams.",
  },
  {
    nombre: "Fondo de escritorio",
    descripcion: "Captura del fondo de pantalla de tu computadora.",
  },
  {
    nombre: "Fondo de celular",
    descripcion: "Captura del fondo de pantalla de tu celular.",
  },
  {
    nombre: "Firma de correo",
    descripcion: "Captura de tu firma configurada en el correo electrónico.",
  },
];

// Tipos de archivo aceptados para capturas y assets.
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// Documentos de oficina y comprimidos (firmas .docx, papelería, tipografías .zip).
export const DOC_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
];

// Assets y recursos compartidos aceptan imágenes y documentos.
export const ASSET_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOC_MIME_TYPES];

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (subidas por la interfaz)
