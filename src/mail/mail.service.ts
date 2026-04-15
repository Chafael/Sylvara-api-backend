// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly apiKey: string;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('BREVO_API_KEY') ?? '';
        this.fromEmail = this.configService.get<string>('MAIL_FROM') ?? 'noreply@sylvara.app';
        this.fromName = 'Sylvara';
    }

    async sendTwoFactorCode(email: string, code: string): Promise<void> {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': this.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: this.fromName,
                    email: this.fromEmail,
                },
                to: [{ email }],
                subject: 'Código de verificación — Sylvara',
                htmlContent: `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:0;background-color:#f4f6f4;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f4;padding:40px 0;">
        <tr>
        <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
                <td style="background-color:#2e7d32;padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">Sylvara</h1>
                <p style="margin:4px 0 0;color:#a5d6a7;font-size:13px;">Sistema de Biodiversidad</p>
                </td>
            </tr>

            <!-- Body -->
            <tr>
                <td style="padding:40px 40px 20px;">
                <h2 style="margin:0 0 12px;color:#1b1b1b;font-size:20px;font-weight:600;">Verificación en dos pasos</h2>
                <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                    Ingresa el siguiente código para completar tu acceso. Este código es válido por <strong>10 minutos</strong>.
                </p>

                <!-- Code box -->
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                    <td align="center" style="padding:24px 0;">
                        <div style="display:inline-block;background-color:#f1f8f1;border:2px dashed #2e7d32;border-radius:10px;padding:20px 40px;">
                        <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#2e7d32;">${code}</span>
                        </div>
                    </td>
                    </tr>
                </table>

                <p style="margin:0 0 8px;color:#888888;font-size:13px;line-height:1.6;">
                    Si no solicitaste este código, puedes ignorar este mensaje. Tu cuenta permanece segura.
                </p>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #eeeeee;text-align:center;">
                <p style="margin:0;color:#aaaaaa;font-size:12px;">
                    © 2026 Sylvara · Este es un correo automático, no respondas a este mensaje.
                </p>
                </td>
            </tr>

            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>
                `,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new InternalServerErrorException(
                `Error al enviar el correo de verificación: ${JSON.stringify(error)}`,
            );
        }
    }
}