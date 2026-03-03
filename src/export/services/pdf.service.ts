import { Injectable } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import PDFDocument = require('pdfkit');
import { ProjectResponseDto } from '../../bio-core/projects/dto/project-response.dto';
import { ProjectsService } from '../../bio-core/projects/projects.service';

@Injectable()
export class PdfService {
    constructor(private readonly projectsService: ProjectsService) { }

    async generatePlotReport(plotId: string, userId: number): Promise<Buffer> {
        const plot = await this.projectsService.findOne(plotId, userId);

        // Intentamos descargar la imagen; si falla simplemente no la incluimos
        const imageBuffer = plot.image ? await this.fetchImage(plot.image).catch(() => null) : null;

        return this.buildPdf(plot, imageBuffer);
    }

    // Descarga una URL (http o https) y devuelve su contenido como Buffer
    private fetchImage(url: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Status ${res.statusCode}`));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            }).on('error', reject);
        });
    }

    private formatDate(value: Date | string | undefined): string {
        if (!value) return '—';
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(value));
    }

    private buildPdf(plot: ProjectResponseDto, imageBuffer: Buffer | null): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Encabezado
            doc.fontSize(20).font('Helvetica-Bold')
                .text('Reporte de Biodiversidad', { align: 'center' })
                .moveDown(0.5);
            doc.fontSize(14).font('Helvetica')
                .text(plot.name, { align: 'center' })
                .moveDown(1);

            // Imagen principal de la parcela (si está disponible)
            if (imageBuffer) {
                doc.image(imageBuffer, {
                    fit: [500, 200],
                    align: 'center',
                }).moveDown(1);
            }

            // Datos generales de la parcela
            doc.fontSize(12).font('Helvetica-Bold').text('Información general').moveDown(0.3);
            doc.font('Helvetica').fontSize(11);
            if (plot.description) doc.text(`Descripción: ${plot.description}`);
            doc.text(`Área total: ${plot.totalArea} ha`);
            doc.text(`Estado: ${plot.status ?? 'activo'}`);
            if (plot.startDate) doc.text(`Inicio: ${this.formatDate(plot.startDate)}`);
            if (plot.endDate) doc.text(`Fin:    ${this.formatDate(plot.endDate)}`);
            doc.moveDown(1);

            // Índices globales del muestreo
            if (plot.globalMetrics) {
                doc.fontSize(12).font('Helvetica-Bold').text('Métricas globales').moveDown(0.3);
                doc.fontSize(11).font('Helvetica');

                const { counts, indices } = plot.globalMetrics;
                if (counts) {
                    doc.text(`Riqueza de especies: ${counts.riqueza ?? '—'}`);
                    doc.text(`Total de individuos: ${counts.total_individuos ?? '—'}`);
                }
                if (indices) {
                    doc.moveDown(0.3);
                    doc.text(`Shannon:  ${indices.shannon ?? '—'}`);
                    doc.text(`Simpson:  ${indices.simpson ?? '—'}`);
                    doc.text(`Margalef: ${indices.margalef ?? '—'}`);
                    doc.text(`Pielou:   ${indices.pielou ?? '—'}`);
                }
                doc.moveDown(1);
            }

            // Una sección por cada zona registrada
            if (plot.zonesDetails?.length) {
                doc.fontSize(12).font('Helvetica-Bold').text('Detalle por zona').moveDown(0.5);

                for (const zone of plot.zonesDetails) {
                    doc.fontSize(11).font('Helvetica-Bold').text(`• ${zone.zone_name}`).moveDown(0.2);
                    doc.font('Helvetica').fontSize(10);
                    doc.text(`  Riqueza: ${zone.riqueza ?? '—'}   Individuos: ${zone.total_individuos ?? '—'}`);

                    if (zone.indices) {
                        doc.text(
                            `  Shannon: ${zone.indices.shannon ?? '—'}  Simpson: ${zone.indices.simpson ?? '—'}  ` +
                            `Margalef: ${zone.indices.margalef ?? '—'}  Pielou: ${zone.indices.pielou ?? '—'}`,
                        );
                    }

                    if (zone.speciesRecords?.length) {
                        doc.moveDown(0.3).text('  Especies registradas:');
                        for (const sp of zone.speciesRecords) {
                            doc.text(
                                `    - ${sp.species_name} (${sp.common_name}) | ` +
                                `${sp.functional_type_name} | n=${sp.individual_count} | ` +
                                `h: ${sp.height_min}–${sp.height_max} m`,
                            );
                        }
                    }
                    doc.moveDown(0.7);
                }
            }

            doc.moveDown(1).fontSize(9).fillColor('grey')
                .text(`Generado por Sylvara — ${this.formatDate(new Date())}`, { align: 'center' });

            doc.end();
        });
    }
}
