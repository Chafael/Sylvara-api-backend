import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';

import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { UnitMeasurement } from '../../common/entities/unit-measurement.entity';
import { User } from '../../auth/entities/user.entity';
import {
    BiodiversityHistory,
    BiodiversityHistoryDocument,
} from '../../bio-core/projects/schemas/biodiversity-history.schema';
import {
    ReportDataResponseDto,
    ZoneBiodiversityDto,
    SpeciesRecordDto,
    GlobalMetricsDto,
} from '../dto/report-data-response.dto';

@Injectable()
export class ReportDataService {
    constructor(
        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        @InjectRepository(StudyZone)
        private readonly zoneRepo: Repository<StudyZone>,

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepo: Repository<SpeciesZone>,

        @InjectRepository(UnitMeasurement)
        private readonly unitRepo: Repository<UnitMeasurement>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectModel(BiodiversityHistory.name)
        private readonly historyModel: Model<BiodiversityHistoryDocument>,
    ) {}

    async getReportData(plotId: number, userId: number): Promise<ReportDataResponseDto> {
        // ── 1. Proyecto + unidad (PostgreSQL) ─────────────────────────────
        const plot = await this.plotRepo.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
            relations: ['unitMeasurement'],
        });
        if (!plot) throw new NotFoundException('Parcela no encontrada.');

        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        // ── 2. Snapshot más reciente de MongoDB ────────────────────────────
        const snapshot = await this.historyModel
            .findOne({
                sampling_plot_id: plotId,
                cycle_number: plot.current_cycle_number,
            })
            .sort({ timestamp: -1 })
            .lean()
            .exec();

        // ── 3. Datos de zonas desde PostgreSQL (sub_area, unit) ────────────
        const pgZones = await this.zoneRepo
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
            .getMany();

        const pgZoneMap = new Map(pgZones.map(z => [z.study_zone_id, z]));

        // ── 4. Si hay snapshot en Mongo, usarlo como fuente principal ───────
        let zonesDetails: ZoneBiodiversityDto[] = [];
        let globalMetrics: GlobalMetricsDto = {
            speciesRichness: 0,
            totalIndividuals: 0,
            indices: { shannon: 0, simpson: 0, margalef: 0, pielou: 0 },
        };

        if (snapshot) {
            // Métricas globales desde MongoDB
            globalMetrics = {
                speciesRichness: snapshot.globalMetrics?.counts?.species_richness ?? 0,
                totalIndividuals: snapshot.globalMetrics?.counts?.total_individuals ?? 0,
                indices: {
                    shannon: snapshot.globalMetrics?.indices?.shannon ?? 0,
                    simpson: snapshot.globalMetrics?.indices?.simpson ?? 0,
                    margalef: snapshot.globalMetrics?.indices?.margalef ?? 0,
                    pielou: snapshot.globalMetrics?.indices?.pielou ?? 0,
                },
            };

            // Zonas desde MongoDB + enriquecidas con sub_area/unit de PG
            zonesDetails = (snapshot.zonesDetails ?? []).map((zone) => {
                const pgZone = pgZoneMap.get(zone.study_zone_id);
                const speciesRecords: SpeciesRecordDto[] = (zone.speciesRecords ?? []).map(
                    (sr) => ({
                        speciesName: sr.species_name,
                        functionalTypeName: sr.functional_type_name ?? '',
                        individualCount: sr.individual_count,
                        heightMin: sr.height_stratum_min ?? 0,
                        heightMax: sr.height_stratum_max ?? 0,
                        unitName: sr.unit_name ?? '',
                    }),
                );

                return {
                    zoneId: zone.study_zone_id,
                    zoneName: zone.name_study_zone,
                    subArea: pgZone ? Number(pgZone.sub_area) : 0,
                    unitName: pgZone?.unitMeasurement?.unit_name ?? '',
                    cycleNumber: plot.current_cycle_number,
                    speciesRichness: (zone as any).counts?.species_richness ?? speciesRecords.length,
                    totalIndividuals:
                        (zone as any).counts?.total_individuals ??
                        speciesRecords.reduce((s, r) => s + r.individualCount, 0),
                    indices: {
                        shannon: zone.indices?.shannon ?? 0,
                        simpson: zone.indices?.simpson ?? 0,
                        margalef: zone.indices?.margalef ?? 0,
                        pielou: zone.indices?.pielou ?? 0,
                    },
                    speciesRecords,
                };
            });
        } else {
            // Fallback: construir desde PostgreSQL en vivo
            zonesDetails = await this.buildZonesFromPostgres(
                pgZones,
                plot.current_cycle_number,
            );
            globalMetrics = this.computeGlobalMetrics(zonesDetails);
        }

        return {
            projectId: plot.sampling_plot_id,
            projectName: plot.sampling_plot_name,
            description: plot.description ?? null,
            totalArea: Number(plot.total_area),
            unitName: plot.unitMeasurement?.unit_name ?? '',
            status: plot.sampling_plot_status,
            cycleNumber: plot.current_cycle_number,
            startDate: plot.start_date ?? null,
            endDate: plot.end_date ?? null,
            researcherName: user.user_name,
            researcherLastname: user.user_lastname,
            globalMetrics,
            zonesDetails,
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private async buildZonesFromPostgres(
        zones: StudyZone[],
        cycleNumber: number,
    ): Promise<ZoneBiodiversityDto[]> {
        return Promise.all(
            zones.map(async (zone) => {
                const speciesZones = await this.speciesZoneRepo.find({
                    where: { study_zone_id: zone.study_zone_id, cycle_number: cycleNumber },
                    relations: ['species', 'species.functionalType', 'unitMeasurement'],
                });

                const speciesRecords: SpeciesRecordDto[] = speciesZones.map((sz) => ({
                    speciesName: sz.species?.species_name ?? '',
                    functionalTypeName: sz.species?.functionalType?.functional_type_name ?? '',
                    individualCount: sz.individual_count,
                    heightMin: sz.height_stratum_min !== null ? Number(sz.height_stratum_min) : 0,
                    heightMax: sz.height_stratum_max !== null ? Number(sz.height_stratum_max) : 0,
                    unitName: sz.unitMeasurement?.unit_name ?? '',
                }));

                const { indices, counts } = this.computeIndices(speciesZones);

                return {
                    zoneId: zone.study_zone_id,
                    zoneName: zone.name_study_zone,
                    subArea: Number(zone.sub_area),
                    unitName: zone.unitMeasurement?.unit_name ?? '',
                    cycleNumber,
                    speciesRichness: counts.species_richness,
                    totalIndividuals: counts.total_individuals,
                    indices,
                    speciesRecords,
                };
            }),
        );
    }

    private computeIndices(speciesZones: SpeciesZone[]) {
        const totalIndividuals = speciesZones.reduce(
            (sum, sz) => sum + sz.individual_count, 0,
        );
        const speciesRichness = speciesZones.length;

        const shannon = speciesZones.reduce((sum, sz) => {
            const p = sz.individual_count / (totalIndividuals || 1);
            return sum + (p > 0 ? -p * Math.log(p) : 0);
        }, 0);

        const simpson =
            totalIndividuals > 1
                ? 1 -
                  speciesZones.reduce(
                      (sum, sz) => sum + sz.individual_count * (sz.individual_count - 1),
                      0,
                  ) / (totalIndividuals * (totalIndividuals - 1))
                : 0;

        const margalef =
            totalIndividuals > 1 ? (speciesRichness - 1) / Math.log(totalIndividuals) : 0;

        const pielou = speciesRichness > 1 ? shannon / Math.log(speciesRichness) : 0;

        return {
            indices: { shannon, simpson, margalef, pielou },
            counts: { species_richness: speciesRichness, total_individuals: totalIndividuals },
        };
    }

    private computeGlobalMetrics(zones: ZoneBiodiversityDto[]): GlobalMetricsDto {
        if (zones.length === 0) {
            return {
                speciesRichness: 0,
                totalIndividuals: 0,
                indices: { shannon: 0, simpson: 0, margalef: 0, pielou: 0 },
            };
        }

        const avg = (key: keyof ZoneBiodiversityDto['indices']) =>
            zones.reduce((s, z) => s + z.indices[key], 0) / zones.length;

        return {
            speciesRichness: zones.reduce((s, z) => s + z.speciesRichness, 0),
            totalIndividuals: zones.reduce((s, z) => s + z.totalIndividuals, 0),
            indices: {
                shannon: avg('shannon'),
                simpson: avg('simpson'),
                margalef: avg('margalef'),
                pielou: avg('pielou'),
            },
        };
    }
}