import { Column, Entity, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import Base from '@app/commons/base-entities/base.entity';
import { WhatsAppSessionEntity } from 'src/features/sessions/entities/session.entity';
import { RolesEntity } from 'src/features/roles/entities/role.entity';

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

  @Column({ unique: true, type: 'varchar', nullable: true })
  phoneNumber: string;

  @Column({ unique: true, type: 'varchar', nullable: true })
  waId: string;

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

  // @Column({
  //   name: 'roles',
  //   type: 'enum',
  //   enum: Role,
  //   array: true,
  //   nullable: false,
  //   default: [Role.USER],
  // })
  // roles: Role[];

  @ManyToMany(() => RolesEntity)
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: RolesEntity[];

  @OneToOne(() => WhatsAppSessionEntity, (session) => session.user)
  session: WhatsAppSessionEntity;
}
