import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Brevo from '@getbrevo/brevo';

@Injectable()
export class MailService {
    private readonly apiInstance: Brevo.TransactionalEmailsApi;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(private readonly configService: ConfigService) {
        this.apiInstance = new Brevo.TransactionalEmailsApi();
        this.apiInstance.setApiKey(
            Brevo.TransactionalEmailsApiApiKeys.apiKey,
            this.configService.get<string>('BREVO_API_KEY') ?? '',
        );
        this.fromEmail = this.configService.get<string>('MAIL_FROM') ?? 'noreply@sylvara.app';
        this.fromName = this.configService.get<string>('MAIL_FROM_NAME') ?? 'Sylvara';
    }

    async sendTwoFactorCode(email: string, code: string): Promise<void> {
        const sendSmtpEmail = new Brevo.SendSmtpEmail();

        sendSmtpEmail.to = [{ email }];
        sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
        sendSmtpEmail.subject = 'Código de verificación — Sylvara';
        sendSmtpEmail.htmlContent = `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2>Verificación en dos pasos</h2>
                <p>Tu código de verificación es:</p>
                <h1 style="letter-spacing: 8px; font-size: 40px; color: #2e7d32;">${code}</h1>
                <p>Este código expira en <strong>10 minutos</strong>.</p>
                <p>Si no intentaste iniciar sesión, ignora este mensaje.</p>
            </div>
        `;

        try {
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al enviar el correo de verificación: ${(error as Error).message}`,
            );
        }
    }
}