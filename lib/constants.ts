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

// Tipos de archivo aceptados. Un solo catálogo para todo lo que sube un admin:
// assets personales, asignación masiva y recursos compartidos.

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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];

export const ARCHIVO_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOC_MIME_TYPES];

// `accept` del input de archivo.
export const ARCHIVO_ACCEPT =
  "image/*,application/pdf,application/zip,.docx,.pptx,.xlsx";

// Mensaje de error único para cuando el formato no está permitido.
export const ARCHIVO_FORMATO_ERROR =
  "Formato no válido. Usa imagen, PDF, ZIP, Word, PowerPoint o Excel.";

// Windows y Office a veces reportan un MIME genérico (o vacío) para los
// formatos OOXML, así que para ellos manda la extensión.
const MIME_POR_EXTENSION: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  zip: "application/zip",
};

/**
 * Valida un archivo subido y devuelve su MIME canónico, o null si no es válido.
 */
export function mimeDeArchivo(
  nombreArchivo: string,
  tipo: string,
): string | null {
  const ext = nombreArchivo.toLowerCase().split(".").pop() ?? "";
  const porExtension = MIME_POR_EXTENSION[ext];
  if (porExtension) return porExtension;
  return ARCHIVO_MIME_TYPES.includes(tipo) ? tipo : null;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (subidas por la interfaz)
