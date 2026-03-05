export class ZoneBiodiversityDto {
    zoneName: string;
    riqueza: number;
    totalIndividuos: number;
    indices: {
        shannon: number;
        simpson: number;
        margalef: number;
        pielou: number;
    };
    speciesRecords: {
        speciesName: string;
        commonName: string;
        functionalTypeName: string;
        individualCount: number;
        heightMin: number;
        heightMax: number;
    }[];
}

export class ReportDataResponseDto {
    // datos del proyecto (PostgreSQL)
    projectName: string;
    description: string | null;
    totalArea: number;
    status: string;
    startDate: Date | null;
    endDate: Date | null;

    // datos del investigador (PostgreSQL)
    researcherName: string;
    researcherLastname: string;

    // biodiversidad completa (MongoDB)
    zonesDetails: ZoneBiodiversityDto[];
}
