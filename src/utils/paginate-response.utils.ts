export interface IPaginateResponse<T> {
  success?: boolean;
  message?: string;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginateResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  success: boolean = true,
  message: string = 'Data Retrieved Successfully',
): IPaginateResponse<T> {
  return {
    success,
    message,
    data,
    total,
    page,
    limit,
  };
}

export function paginateResponseWithMeta<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  success: boolean = true,
  message: string = 'Data Retrieved Successfully',
): IPaginateResponse<T> {
  return {
    success,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
