export class CursorMetaDto {
    nextCursor: number | null;
    limit: number;
}

export class PaginatedSpeciesDto<T> {
    data: T[];
    meta: CursorMetaDto;
}