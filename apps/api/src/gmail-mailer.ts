import { google } from "googleapis";

interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
}

class GmailMailerService {
  private oauth2Client: any;
  private gmail: any;
  private enabled: boolean;
  private user: string;

  constructor() {
    this.enabled = process.env.GMAIL_ENABLED === "true";
    this.user = process.env.GMAIL_USER || "";

    if (this.enabled) {
      const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      this.oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });

      this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
      
      console.log(`[Gmail] Servicio habilitado para: ${this.user}`);
    } else {
      console.log("[Gmail] Servicio deshabilitado");
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private createMessage(to: string, subject: string, htmlBody: string, cc?: string): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const messageParts = [
      `From: Portal PPTO <${this.user}>`,
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      htmlBody
    ];
    
    const message = messageParts.join("\n");
    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async sendEmail({ to, cc, subject, htmlBody }: EmailOptions): Promise<void> {
    if (!this.enabled) {
      console.warn("[Gmail] Intento de envío con servicio deshabilitado");
      return;
    }

    try {
      const encodedMessage = this.createMessage(to, subject, htmlBody, cc);
      
      const res = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage
        }
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`[Gmail] Correo enviado exitosamente a ${to} (ID: ${res.data.id})`);
      }
    } catch (error: any) {
      const reason = error?.response?.data?.error?.message || error.message || "Error desconocido";
      console.error("[Gmail] Error al enviar correo:", reason);
      throw new Error(`No se pudo enviar el correo: ${reason}`);
    }
  }

  createOcDeliveryEmail(data: {
    recipientEmail: string;
    recipientName: string;
    ocNumber: string;
    description: string;
    supportName: string;
    periodText: string;
    deliveryLink: string;
  }): EmailOptions {
    const { recipientEmail, recipientName, ocNumber, description, supportName, periodText, deliveryLink } = data;
    
    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OC Entregada</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d6efd 0%, #0aa2ff 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ✅ Tu Orden de Compra está lista
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                Hola <strong>${recipientName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #555555; line-height: 1.6;">
                Nos complace informarte que tu <strong>Orden de Compra #${ocNumber}</strong> ha sido procesada y está lista para su uso.
              </p>
              
              <!-- Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">
                          <strong style="color: #333333;">📋 Descripción:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 12px 0; font-size: 15px; color: #444444;">
                          ${description || 'No especificada'}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">
                          <strong style="color: #333333;">🎯 Sustento:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 12px 0; font-size: 15px; color: #444444;">
                          ${supportName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">
                          <strong style="color: #333333;">📅 Período:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0; font-size: 15px; color: #444444;">
                          ${periodText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button - Ver OC -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${deliveryLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0d6efd 0%, #0aa2ff 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(13, 110, 253, 0.35);">
                      📄 Ver Orden de Compra
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; font-size: 15px; color: #555555; line-height: 1.6; text-align: center;">
                También puedes consultar todas tus órdenes en cualquier momento desde el portal:
              </p>
              
              <!-- CTA Button - Portal -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="http://10-43-149-8.nip.io:5173/purchase-orders/listado" 
                       style="display: inline-block; padding: 14px 35px; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
                      🌐 Ir al Portal PPTO
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #888888;">
                Este es un mensaje automático del Portal PPTO
              </p>
              <p style="margin: 0; font-size: 13px; color: #888888;">
                © ${new Date().getFullYear()} Portal PPTO - Gestión de Presupuesto
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return {
      to: recipientEmail,
      cc: "sergio.torres@interseguro.com.pe",
      subject: `✅ Tu Orden de Compra #${ocNumber} está lista`,
      htmlBody
    };
  }
}

export const gmailMailerService = new GmailMailerService();
