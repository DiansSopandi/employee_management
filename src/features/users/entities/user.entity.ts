import { Column, Entity } from 'typeorm';
import Base from '@app/commons/base-entities/base.entity';
import { ROLES } from '@app/commons/constants/enums';

@Entity('users')
export class UsersEntity extends Base {
  @Column({
    name: 'username',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  username: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    name: 'password',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  password: string;

  @Column({
    name: 'emailVerificationCode',
    type: 'varchar',
    nullable: true,
  })
  emailVerificationCode: string;

  @Column({
    name: 'isActive',
    type: 'boolean',
    default: false,
  })
  isActive: boolean;

  @Column({
    name: 'roles',
    type: 'enum',
    enum: ROLES,
    array: true,
    nullable: false,
    default: [ROLES.USER],
  })
  roles: ROLES[];
}
