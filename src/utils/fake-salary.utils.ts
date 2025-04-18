// libs/utils/fake-salary.ts
import { faker } from '@faker-js/faker';

export function generateFakeSalaries(count: number = 10) {
  const rawData = Array.from({ length: count }).map(() => ({
    // employeeId: faker.number.int({ min: 1, max: 1000 }),
    employeeId: faker.number.int({ min: 21, max: 50 }),
    name: faker.person.fullName(),
    baseSalary: faker.number.float({
      min: 3000,
      max: 10000,
      fractionDigits: 2,
    }),
    bonus: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
    period: faker.date.recent().toISOString().split('T')[0], // yyyy-mm-dd
  }));

  return Array.from(
    new Map(rawData.map((item) => [item.employeeId, item])).values(),
  );
}
