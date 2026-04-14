import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private readonly resend: Resend;
    private readonly fromEmail: string;

    constructor(private readonly configService: ConfigService) {
        this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
        this.fromEmail = configService.get<string>('MAIL_FROM') ?? 'noreply@sylvara.app';
    }

    async sendTwoFactorCode(email: string, code: string): Promise<void> {
        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: 'Código de verificación — Sylvara',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                    <h2>Verificación en dos pasos</h2>
                    <p>Tu código de verificación es:</p>
                    <h1 style="letter-spacing: 8px; font-size: 40px; color: #2e7d32;">${code}</h1>
                    <p>Este código expira en <strong>10 minutos</strong>.</p>
                    <p>Si no intentaste iniciar sesión, ignora este mensaje.</p>
                </div>
            `,
        });
    }
}