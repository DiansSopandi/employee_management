import { Action } from '@app/commons';
import Base from '@app/commons/base-entities/base.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('permissions')
@Unique(['resource', 'action']) // Prevent duplicate resource-action pair
export class PermissionEntity extends Base {
  //   @PrimaryGeneratedColumn('uuid')
  //   id: string;

  @Column()
  resource: string; // e.g., 'Products'

  @Column('text', { nullable: true, default: Action.READ })
  action: string; // e.g., 'Create', 'Read', 'Update', 'Delete'
  // @Column('text', { array: true })
  // actions: string[]; // e.g., ['Create', 'Read', 'Update']
}
