import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Repository } from 'typeorm';
import { RolesEntity } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RolesEntity)
    private readonly rolesRepository: Repository<RolesEntity>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    // Map permission IDs to PermissionEntity objects
    const permissions = createRoleDto.permissions?.map((id) => ({ id })) || [];
    const role = this.rolesRepository.create({
      ...createRoleDto,
      permissions,
    });
    return await this.rolesRepository
      .save(role)
      .then((savedRole) => {
        return {
          success: true,
          message: 'Role created successfully',
          data: savedRole,
        };
      })
      .catch((error) => {
        throw new Error(`Failed to create role: ${error.message}`);
      });
  }

  findAll() {
    return this.rolesRepository
      .find({
        select: ['id', 'name', 'description', 'createdAt'],
        relations: ['permissions'], // Include permissions in the response
        order: {
          name: 'ASC', // Order by role name
          createdAt: 'DESC', // Order by creation date
        },
      })
      .then((roles) => {
        return {
          success: true,
          message: 'Roles retrieved successfully',
          data: roles,
        };
      })
      .catch((error) => {
        throw new Error(`Failed to retrieve roles: ${error.message}`);
      });
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
