import { Module } from '@nestjs/common';
import { BigQueryService } from './bigquery.service';
import { PdfService } from './services/pdf.service';
import { ExportController } from './export.controller';
import { BioCoreModule } from '../bio-core/bio-core.module';

@Module({
    imports: [BioCoreModule],
    controllers: [ExportController],
    providers: [BigQueryService, PdfService],
    exports: [BigQueryService, PdfService],
})
export class ExportModule { }
