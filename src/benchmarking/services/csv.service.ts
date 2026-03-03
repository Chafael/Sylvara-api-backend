import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SnapshotRow } from './snapshot.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvService {
    private readonly outputDir = path.join(process.cwd(), 'backups');

    constructor() {
        // crear carpeta backups si no existe
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /** Genera CSV y retorna la ruta del archivo creado */
    generateCsv(rows: SnapshotRow[], projectId: number): string {
        if (rows.length === 0) {
            throw new InternalServerErrorException(
                'No hay datos en el snapshot para generar el CSV.',
            );
        }

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `project_${projectId}_${date}.csv`;
        const filePath = path.join(this.outputDir, fileName);

        try {
            const headers = Object.keys(rows[0]).join(',');
            const lines = rows.map((row) =>
                Object.values(row)
                    .map((val) => {
                        const str = String(val ?? '');
                        // escapar valores que contengan comas o saltos de línea
                        return str.includes(',') || str.includes('\n')
                            ? `"${str.replace(/"/g, '""')}"`
                            : str;
                    })
                    .join(','),
            );

            const content = [headers, ...lines].join('\n');
            fs.writeFileSync(filePath, content, { encoding: 'utf-8' });

            return filePath;
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al generar CSV: ${(error as Error).message}`,
            );
        }
    }

    /** Retorna el Buffer del último CSV generado para descarga */
    getLatestCsv(projectId: number): { buffer: Buffer; fileName: string } | null {
        const files = fs.readdirSync(this.outputDir)
            .filter((f) => f.startsWith(`project_${projectId}_`) && f.endsWith('.csv'))
            .sort()
            .reverse();

        if (files.length === 0) return null;

        const fileName = files[0];
        const filePath = path.join(this.outputDir, fileName);
        const buffer = fs.readFileSync(filePath);

        return { buffer, fileName };
    }
}