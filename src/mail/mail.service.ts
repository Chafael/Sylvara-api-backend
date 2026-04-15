// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly transporter: nodemailer.Transporter;
    private readonly fromEmail: string;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: this.configService.get<string>('BREVO_SMTP_USER'),
                pass: this.configService.get<string>('BREVO_SMTP_KEY'),
            },
        });

        this.fromEmail = this.configService.get<string>('MAIL_FROM') ?? 'noreply@sylvara.app';
    }

    async sendTwoFactorCode(email: string, code: string): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: `"Sylvara" <${this.fromEmail}>`,
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
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al enviar el correo de verificación: ${(error as Error).message}`,
            );
        }
    }
}