export interface PaginatedResult<TData> {
  items: TData[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}
