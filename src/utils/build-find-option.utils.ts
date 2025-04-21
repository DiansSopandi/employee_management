// users/utils/build-find-options.ts
import { FindManyOptions, ILike } from 'typeorm';
import { parseSort } from './parse-sort.utils';

interface BuildFindOptionsParams<T> {
  filter: {
    page?: number;
    pageSize?: number;
    fullSearch?: string;
    sort?: string;
  };
  searchableFields?: (keyof T)[];
  select?: FindManyOptions<T>['select'];
  relations?: FindManyOptions<T>['relations'];
}

export function buildFindOptions<T>({
  select,
  filter,
  searchableFields = [],
  relations,
}: BuildFindOptionsParams<T>): FindManyOptions<T> {
  const { page = 0, pageSize = 10, fullSearch, sort } = filter;
  const trimFullSearch = fullSearch?.trim();
  // Handle search
  let where: any = {};
  if (trimFullSearch && searchableFields.length > 0) {
    where = searchableFields.map((field) => ({
      [field]: ILike(`%${fullSearch}%`),
    }));
  }

  // Handle sort
  //   const order: FindManyOptions<T>['order'] = {};
  //   sort?.split(',').forEach((field) => {
  //     const direction = field.startsWith('-') ? 'DESC' : 'ASC';
  //     const key = field.replace(/^[-+]/, '') as keyof T;
  //     order[key] = direction as any;
  //   });
  const order = parseSort(sort) as FindManyOptions<T>['order'];

  return {
    select,
    where,
    order,
    skip: page * pageSize,
    take: pageSize,
    relations,
  };
}
