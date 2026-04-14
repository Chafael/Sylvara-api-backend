import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) {}

    async sendTwoFactorCode(email: string, code: string): Promise<void> {
        await this.mailerService.sendMail({
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