import { Repository } from 'typeorm';
import { parseSort } from './parse-sort.utils';

interface QueryBuilderParams {
  repository: Repository<any>;
  filter: {
    page?: number;
    pageSize?: number;
    fullSearch?: string;
    sort?: string;
  };
  searchableFields?: string[];
  select?: string[];
  onlyWithRoles?: boolean;
}

export function buildUserQueryBuilderWithRoles({
  repository,
  filter,
  searchableFields = [],
  select = ['user.id', 'user.username', 'user.email'],
  onlyWithRoles = false,
}: QueryBuilderParams) {
  const { page = 0, pageSize = 10, fullSearch, sort } = filter;
  const trimFullSearch = fullSearch?.trim();

  const queryBuilder = repository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'roles');

  queryBuilder.select([...select, 'roles']);

  if (onlyWithRoles) {
    queryBuilder.where('roles.id IS NOT NULL');
  }

  if (trimFullSearch && searchableFields.length > 0) {
    const searchCondition = searchableFields
      .map((field) => `user.${field} ILIKE :search`)
      .join(' OR ');

    if (onlyWithRoles) {
      queryBuilder.andWhere(`(${searchCondition})`, {
        search: `%${trimFullSearch}%`,
      });
    } else {
      queryBuilder.where(`(${searchCondition})`, {
        search: `%${trimFullSearch}%`,
      });
    }
  }

  if (sort) {
    const parsedSort = parseSort(sort);
    Object.entries(parsedSort).forEach(([field, order]) => {
      queryBuilder.addOrderBy(`user.${field}`, order as 'ASC' | 'DESC');
    });
  }

  queryBuilder.skip(page * pageSize).take(pageSize);

  return queryBuilder;
}
