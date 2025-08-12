// users/utils/build-find-options.ts
import { FindManyOptions, ILike, IsNull, Not } from 'typeorm';
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
  where?: FindManyOptions<T>['where'];
  onlyWithRoles?: boolean;
}

export function buildFindOptions<T>({
  select,
  filter,
  searchableFields = [],
  relations,
  where: additionalWhere = {},
  onlyWithRoles = false,
}: BuildFindOptionsParams<T>): FindManyOptions<T> {
  const { page = 0, pageSize = 10, fullSearch, sort } = filter;

  const trimFullSearch = fullSearch?.trim();
  let where: any = additionalWhere || {};

  if (onlyWithRoles) {
    console.warn(
      'onlyWithRoles filter requires Query Builder, not findAndCount',
    );
    throw new Error(
      'onlyWithRoles filter requires Query Builder. Use buildUserQueryWithRoles instead.',
    );
  }
  if (onlyWithRoles) {
    where.roles = Not(IsNull());
  }

  if (trimFullSearch && searchableFields.length > 0) {
    const searchConditions = searchableFields.map((field) => ({
      [field]: ILike(`%${trimFullSearch}%`),
    }));

    if (onlyWithRoles) {
      where = searchConditions.map((condition) => ({
        ...condition,
        roles: Not(IsNull()),
      }));
    } else {
      where = searchableFields;
    }
  }

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
