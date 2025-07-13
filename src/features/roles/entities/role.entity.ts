import Base from '@app/commons/base-entities/base.entity';
import { PermissionEntity } from 'src/features/permissions/entities/permission.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

@Entity('roles')
export class RolesEntity extends Base {
  @Column({
    unique: true,
  })
  name: string;

  @Column({ nullable: true })
  description: string;

  // Catatan: cascade: true hanya digunakan kalau kamu ingin auto-create permission saat create role. Biasanya ini tidak perlu, jadi bisa dihapus jika kamu ingin relasi permission yang sudah ada saja:
  // Karena permissions biasanya sudah didefinisikan sebelumnya secara terpisah (di seeder atau UI permission manager). Jadi saat create role, kamu cukup referensikan ID permission yang sudah ada.

  @ManyToMany(() => PermissionEntity, {
    // cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions: PermissionEntity[];
}
