# Plataforma de Gestión de Marca — Generando Ideas

**Fecha:** 2026-07-13
**Estado:** Diseño aprobado

## Propósito

Sistema web para gestionar el uso correcto de la marca por parte de los empleados de
Generando Ideas. Los empleados descargan sus assets de marca (firma de correo, fondos,
etc.) y suben evidencias (capturas) de que los están usando correctamente. Un
administrador revisa y aprueba/rechaza cada evidencia.

## Decisiones clave

- **App real desplegable** en Vercel (login real, base de datos, almacenamiento de archivos).
- **Assets personalizados por empleado** (firma con su nombre/cargo). Los fondos se pueden
  asignar a varios empleados de una vez.
- **Validación con aprobación**: cada evidencia queda Pendiente y el admin la Aprueba o
  Rechaza con comentario.
- **Alta por admin**: el administrador crea a cada empleado.
- **Envío único**: cada evidencia se sube una vez; solo se re-sube si es rechazada.
- **Categorías configurables** por el admin (crear, renombrar, reordenar, desactivar).

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS** — full-stack, desplegable en Vercel.
- **Prisma ORM**. Dev con **SQLite** para correr sin servicios externos; producción con
  **Postgres (Neon / Vercel Marketplace)** cambiando el `provider` y `DATABASE_URL`.
- **Almacenamiento de archivos** vía capa de abstracción: en dev se guardan en disco local
  y se sirven por una ruta autenticada; en producción se usa **Vercel Blob** (privado).
- **Auth.js (NextAuth v5) — Credentials**: email + contraseña. El admin crea al empleado
  con contraseña temporal; el empleado la puede cambiar.

## Roles

- **Administrador**: gestiona empleados, categorías, sube assets de cada quien, revisa y
  aprueba/rechaza evidencias, ve el dashboard de cumplimiento.
- **Empleado**: descarga sus assets, sube capturas de evidencia, ve el estado de cada una.

## Modelo de datos

### Usuario
`id`, `nombre`, `email` (único), `cargo`, `rol` (ADMIN | EMPLEADO), `passwordHash`,
`activo`, `createdAt`.

### Categoría (configurable)
`id`, `nombre` (ej. "Fondo de Teams"), `descripcion`, `orden`, `activa`, `createdAt`.

### Asset (lo que descarga el empleado)
`id`, `userId` (dueño), `categoriaId`, `nombre`, `archivoKey`, `mimeType`, `subidoPor`,
`createdAt`. Personalizado por empleado; el admin puede asignar un mismo archivo a varios.

### Evidencia (lo que sube el empleado)
`id`, `userId`, `categoriaId`, `archivoKey`, `mimeType`, `estado`
(PENDIENTE | APROBADA | RECHAZADA), `comentarioRevision`, `revisadoPor`, `revisadoEn`,
`createdAt`. Única por (`userId`, `categoriaId`); al re-subir tras rechazo vuelve a
PENDIENTE.

## Experiencia del Empleado

Panel con una tarjeta por categoría activa. Cada tarjeta:
1. **Descargar** el/los asset(s) asignados (su firma, su fondo, etc.).
2. **Subir** la captura de evidencia.
3. **Estado**: Pendiente / Aprobada / Rechazada (+ comentario si fue rechazada).

Barra de progreso general: "N de M evidencias aprobadas".

## Experiencia del Administrador

- **Empleados**: lista con % de cumplimiento; crear / editar / desactivar.
- **Detalle de empleado**: subir/gestionar assets y ver/aprobar/rechazar evidencias.
- **Bandeja de revisión**: todas las evidencias pendientes en un solo lugar.
- **Categorías**: CRUD + reordenar + desactivar; asignar un asset a varios/todos.
- **Dashboard**: resumen de cumplimiento de la empresa.

## Archivos y seguridad

- Archivos privados. En producción (Vercel Blob) se sirven con acceso controlado; en dev,
  vía ruta API autenticada. Solo el dueño y el admin acceden.

## Fuera de alcance (v1)

Notificaciones por correo, exportar reportes (Excel/PDF), auditorías recurrentes por
período, historial de versiones de evidencia. El diseño no impide agregarlos después.
