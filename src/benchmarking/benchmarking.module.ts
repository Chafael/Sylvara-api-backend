import { Module } from '@nestjs/common';
import { BenchmarkingController } from './benchmarking.controller';
import { SnapshotService } from './services/snapshot.service';
import { CsvService } from './services/csv.service';
import { ExportModule } from '../export/export.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ExportModule, AuthModule],
    controllers: [BenchmarkingController],
    providers: [SnapshotService, CsvService],
})
export class BenchmarkingModule {}