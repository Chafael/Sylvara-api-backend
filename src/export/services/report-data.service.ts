import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { User } from '../../auth/entities/user.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { ReportDataResponseDto, ZoneBiodiversityDto } from '../dto/report-data-response.dto';

@Injectable()
export class ReportDataService {
    constructor(
        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(StudyZone)
        private readonly zoneRepo: Repository<StudyZone>,

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepo: Repository<SpeciesZone>,
    ) {}

    async getReportData(plotId: number, userId: number): Promise<ReportDataResponseDto> {
        const plot = await this.plotRepo.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
        });
        if (!plot) throw new NotFoundException('Parcela no encontrada.');

        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        const zones = await this.zoneRepo.find({
            where: { sampling_plot_id: plotId },
        });

        const zonesDetails: ZoneBiodiversityDto[] = await Promise.all(
            zones.map(async (zone) => {
                const speciesZones = await this.speciesZoneRepo.find({
                    where: { study_zone_id: zone.study_zone_id },
                    relations: ['species', 'species.functionalType'],
                });

                const totalIndividuos = speciesZones.reduce((sum, sz) => sum + sz.individual_count, 0);
                const riqueza = speciesZones.length;

                // Shannon
                const shannon = speciesZones.reduce((sum, sz) => {
                    const p = sz.individual_count / (totalIndividuos || 1);
                    return sum + (p > 0 ? -p * Math.log(p) : 0);
                }, 0);

                // Simpson
                const simpson = totalIndividuos > 1
                    ? 1 - speciesZones.reduce((sum, sz) => {
                        return sum + (sz.individual_count * (sz.individual_count - 1));
                    }, 0) / (totalIndividuos * (totalIndividuos - 1))
                    : 0;

                // Margalef
                const margalef = totalIndividuos > 1
                    ? (riqueza - 1) / Math.log(totalIndividuos)
                    : 0;

                // Pielou
                const pielou = riqueza > 1 ? shannon / Math.log(riqueza) : 0;

                return {
                    zoneName: zone.name_study_zone,
                    riqueza,
                    totalIndividuos,
                    indices: { shannon, simpson, margalef, pielou },
                    speciesRecords: speciesZones.map((sz) => ({
                        speciesName: sz.species?.species_name ?? '',
                        commonName: '',
                        functionalTypeName: sz.species?.functionalType?.functional_type_name ?? '',
                        individualCount: sz.individual_count,
                        heightMin: sz.height_stratum_min ?? 0,
                        heightMax: sz.height_stratum_max ?? 0,
                    })),
                };
            }),
        );

        return {
            projectName: plot.sampling_plot_name,
            description: plot.description,
            totalArea: Number(plot.total_area),
            status: plot.sampling_plot_status,
            startDate: plot.start_date,
            endDate: plot.end_date,
            researcherName: user.user_name,
            researcherLastname: user.user_lastname,
            zonesDetails,
        };
    }
}