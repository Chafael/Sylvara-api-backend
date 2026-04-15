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
                    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                        <h2>Verificación en dos pasos</h2>
                        <p>Tu código de verificación es:</p>
                        <h1 style="letter-spacing: 8px; font-size: 40px; color: #2e7d32;">${code}</h1>
                        <p>Este código expira en <strong>10 minutos</strong>.</p>
                        <p>Si no intentaste iniciar sesión, ignora este mensaje.</p>
                    </div>
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