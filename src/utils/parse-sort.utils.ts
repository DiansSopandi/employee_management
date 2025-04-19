import { FindManyOptions } from 'typeorm';

export function parseSort<T>(sort?: string): Record<string, 'ASC' | 'DESC'> {
  if (!sort) return { id: 'DESC' };

  // const order: Record<string, 'ASC' | 'DESC'> = {};
  const order: FindManyOptions<T>['order'] = {};
  const fields = sort.split(',');

  fields.forEach((field) => {
    const direction = field.startsWith('-') ? 'DESC' : 'ASC';
    const key = field.replace(/^[-+]/, '') as keyof T;

    order[key] = direction as any;
  });

  return order as Record<string, 'ASC' | 'DESC'>;
}
