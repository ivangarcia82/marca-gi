import { Resend } from "resend";

const BRAND = "#ff8300";
const INK = "#2e3033";

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plantillaRechazo(
  nombre: string,
  categoria: string,
  motivo: string,
  appUrl: string,
): string {
  const primerNombre = escapar(nombre.split(" ")[0] || nombre);
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f6f7f8;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e2e5e8;border-radius:16px;overflow:hidden;">
      <div style="background:${BRAND};height:6px;"></div>
      <div style="padding:28px 28px 8px;">
        <p style="margin:0 0 2px;font-size:13px;font-weight:bold;color:${INK};">Generando Ideas</p>
        <p style="margin:0 0 20px;font-size:12px;color:#8d8f93;">Gestión de marca</p>

        <h1 style="margin:0 0 12px;font-size:18px;color:${INK};">Tu evidencia necesita corrección</h1>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4a4d51;">
          Hola ${primerNombre}, revisamos tu evidencia de
          <strong>${escapar(categoria)}</strong> y no pudo aprobarse. Por favor
          corrígela y vuelve a subirla en la plataforma.
        </p>

        <div style="margin:16px 0;padding:12px 14px;background:#fdecec;border:1px solid #f5c2c2;border-radius:10px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#b3261e;">Motivo del rechazo</p>
          <p style="margin:0;font-size:14px;line-height:1.5;color:#7a1a15;">${escapar(motivo)}</p>
        </div>

        <a href="${appUrl}/dashboard"
           style="display:inline-block;margin:8px 0 20px;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:10px;">
          Subir de nuevo
        </a>

        <p style="margin:0;font-size:12px;color:#8d8f93;line-height:1.5;">
          Si tienes dudas, responde a este correo o contacta a tu administrador.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#b6b8bc;margin:16px 0 0;">
      Este es un mensaje automático de la plataforma de marca de Generando Ideas.
    </p>
  </div>
</body></html>`;
}

/**
 * Envía el correo de rechazo al empleado. No lanza: si algo falla (o falta la
 * API key), solo lo registra para no romper el flujo de revisión.
 */
export async function enviarCorreoRechazo(params: {
  para: string;
  nombre: string;
  categoria: string;
  motivo: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ??
    "Generando Ideas · Marca <no-reply@notificaciones.generandoideas.com>";
  const appUrl = process.env.APP_URL ?? "https://marca.generandoideas.com";

  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada; se omite el correo de rechazo.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: params.para,
      subject: `Tu evidencia de "${params.categoria}" necesita corrección`,
      html: plantillaRechazo(
        params.nombre,
        params.categoria,
        params.motivo,
        appUrl,
      ),
    });
    if (error) console.error("Resend devolvió un error:", error);
  } catch (e) {
    console.error("Error enviando correo de rechazo:", e);
  }
}
