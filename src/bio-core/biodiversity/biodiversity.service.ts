import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';

import { BiodiversityCache } from '../projects/schemas/biodiversity-cache.schema';
import { BiodiversityHistory } from '../projects/schemas/biodiversity-history.schema';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';

@Injectable()
export class BiodiversityService {
    constructor(
        @InjectModel(BiodiversityCache.name)
        private readonly cacheModel: Model<BiodiversityCache>,

        @InjectModel(BiodiversityHistory.name)
        private readonly historyModel: Model<BiodiversityHistory>,

        @InjectRepository(StudyZone)
        private readonly zoneRepo: Repository<StudyZone>,

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepo: Repository<SpeciesZone>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,
    ) {}

    private computeIndices(speciesZones: SpeciesZone[]) {
        const totalIndividuals = speciesZones.reduce((sum, sz) => sum + sz.individual_count, 0);
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

    /**
     * Recalcula y persiste biodiversity_cache (upsert) y
     * biodiversity_history (append) para el proyecto y ciclo dados.
     */
    async recalculateForPlot(plotId: number, cycleNumber: number): Promise<void> {
        const zones = await this.zoneRepo.find({
            where: { sampling_plot_id: plotId, cycle_number: cycleNumber },
        });

        const zonesDetails = await Promise.all(
            zones.map(async (zone) => {
                const speciesZones = await this.speciesZoneRepo.find({
                    where: { study_zone_id: zone.study_zone_id, cycle_number: cycleNumber },
                });

                const { indices, counts } = this.computeIndices(speciesZones);

                return {
                    study_zone_id: zone.study_zone_id,
                    name_study_zone: zone.name_study_zone,
                    indices,
                    counts,
                };
            }),
        );

        const allSpeciesZones =
            zones.length > 0
                ? await this.speciesZoneRepo
                      .createQueryBuilder('sz')
                      .where('sz.study_zone_id IN (:...ids)', {
                          ids: zones.map((z) => z.study_zone_id),
                      })
                      .andWhere('sz.cycle_number = :cycle', { cycle: cycleNumber })
                      .getMany()
                : [];

        const { indices: globalIndices, counts: globalCounts } =
            this.computeIndices(allSpeciesZones);

        const globalMetrics = { indices: globalIndices, counts: globalCounts };

        // upsert: refleja siempre el estado actual del proyecto
        await this.cacheModel.findOneAndUpdate(
            { sampling_plot_id: plotId, cycle_number: cycleNumber },
            { $set: { lastUpdated: new Date(), globalMetrics, zonesDetails } },
            { upsert: true },
        );

        // append: registro inmutable por timestamp para historial y PDFs
        await this.historyModel.create({
            timestamp: new Date(),
            sampling_plot_id: plotId,
            cycle_number: cycleNumber,
            globalMetrics,
            zonesDetails,
        });
    }

    /**
     * Wrapper para disparar el recálculo a partir del ID de zona,
     * útil cuando no se tiene el plotId directamente (SpeciesService).
     */
    async recalculateForZone(zoneId: number): Promise<void> {
        const zone = await this.zoneRepo.findOne({ where: { study_zone_id: zoneId } });
        if (!zone) return;
        await this.recalculateForPlot(zone.sampling_plot_id, zone.cycle_number);
    }
}