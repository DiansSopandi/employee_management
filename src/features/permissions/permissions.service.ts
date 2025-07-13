import { Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepository: Repository<PermissionEntity>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const permission = this.permissionsRepository.create(createPermissionDto); // hanya instantiate entity
    return await this.permissionsRepository
      .save(permission)
      .then((savedPermission) => {
        return {
          success: true,
          message: 'Permission created successfully',
          data: savedPermission,
        }; // mengembalikan entity yang sudah disimpan
      })
      .catch((error) => {
        throw new Error(`Failed to create permission: ${error.message}`);
      });
  }

  findAll() {
    return `This action returns all permissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} permission`;
  }

  update(id: number, updatePermissionDto: UpdatePermissionDto) {
    return `This action updates a #${id} permission`;
  }

  remove(id: number) {
    return `This action removes a #${id} permission`;
  }
}
