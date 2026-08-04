# Plataforma de Gestión de Marca — Generando Ideas

Sistema web para gestionar el uso correcto de la marca por parte de los empleados.
Los empleados descargan sus archivos de marca (firma, fondos, etc.) y suben evidencias
(capturas) de que los usan correctamente. Un administrador revisa y aprueba o rechaza
cada evidencia.

## Funcionalidades

- **Roles**: Administrador y Empleado, con rutas protegidas.
- **Empleado**: descarga sus archivos de marca, sube capturas de evidencia y ve el estado
  (Pendiente / Aprobada / Rechazada) con barra de cumplimiento.
- **Administrador**: da de alta empleados, gestiona categorías (crear, editar, reordenar,
  activar/desactivar, eliminar), sube archivos por empleado o los asigna a varios de una
  vez, y aprueba/rechaza evidencias desde una bandeja de revisión.
- **Archivos privados**: capturas y assets se sirven solo al dueño o al administrador.

## Requisitos

- Node.js 20+ (probado con Node 22)

## Puesta en marcha (local)

```bash
npm install          # instala dependencias
npm run setup        # crea la base de datos SQLite y siembra admin + categorías
npm run dev          # arranca en http://localhost:3000
```

### Credenciales del administrador inicial

Definidas en `.env` (cámbialas antes de usar en serio):

- **Correo:** `admin@generandoideas.com`
- **Contraseña:** `Admin1234`

El administrador crea a los empleados desde **Empleados → Nuevo empleado** y les entrega su
contraseña temporal.

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run setup` | `db:push` + `db:seed` (base + datos iniciales) |
| `npm run db:seed` | Crea admin y categorías iniciales |
| `npm run db:studio` | Explorador visual de la base (Prisma Studio) |

## Variables de entorno (`.env`)

```
DATABASE_URL="file:./dev.db"     # SQLite en dev
AUTH_SECRET="..."                # secreto de sesión (generado)
AUTH_TRUST_HOST=true
ADMIN_EMAIL="admin@generandoideas.com"
ADMIN_PASSWORD="Admin1234"
ADMIN_NOMBRE="Administrador"
# En producción con Vercel Blob:
# BLOB_READ_WRITE_TOKEN="..."    # activa el almacenamiento en la nube
```

## Arquitectura

- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**
- **Prisma 6** sobre SQLite (dev). Modelo en `prisma/schema.prisma`.
- **Auth.js v5 (Credentials)** con sesión JWT. Config en `auth.ts` / `auth.config.ts`,
  protección de rutas en `middleware.ts`.
- **Almacenamiento** abstracto en `lib/storage.ts`: disco local en dev, Vercel Blob en
  prod. Los archivos se sirven por la ruta autenticada `app/api/files/[tipo]/[id]`.
- **Mutaciones** vía Server Actions (`app/**/actions.ts`).

## Despliegue en Vercel (producción)

1. **Base de datos Postgres** (Neon u otra del Marketplace de Vercel):
   - En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `provider = "postgresql"`.
   - Define `DATABASE_URL` con la cadena de Postgres.
   - Ejecuta `npx prisma db push` y `npm run db:seed` contra esa base.
2. **Almacenamiento**: crea un store de **Vercel Blob** y define `BLOB_READ_WRITE_TOKEN`.
   El código detecta el token y usa Blob automáticamente.
3. **Variables**: define `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `DATABASE_URL`,
   `BLOB_READ_WRITE_TOKEN` y las `ADMIN_*` en el proyecto de Vercel.
4. Despliega. El `build` corre `prisma generate` automáticamente.

## Notas

- Diseño y decisiones en `docs/superpowers/specs/2026-07-13-plataforma-marca-design.md`.
- Los archivos locales se guardan en `.storage/` (ignorado por git).
