import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesEntity } from './entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolesEntity])], // Add your RoleEntity here
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule], // Export RolesService and TypeOrmModule for use in other modules
})
export class RolesModule {}
