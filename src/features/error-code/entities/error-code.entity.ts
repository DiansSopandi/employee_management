import Base from '@app/commons/base-entities/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('errorcodes')
export class ErrorCodeEntity extends Base {
  @Column({ unique: true })
  code: string;

  @Column()
  message: string;
}
