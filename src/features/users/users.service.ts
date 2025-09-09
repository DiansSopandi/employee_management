import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from './entities/user.entity';
import {
  Repository,
  FindManyOptions,
  ILike,
  In,
  IsNull as TypeOrmIsNull,
} from 'typeorm';
import { PasswordUtils } from 'src/utils/password.utils';
import { CreateAuthenticateDto } from '../auth/dto/create-auth.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { parseSort } from 'src/utils/parse-sort.utils';
import {
  paginateResponse,
  paginateResponseWithMeta,
  IPaginateResponse,
} from 'src/utils/paginate-response.utils';
import { buildFindOptions } from 'src/utils/build-find-option.utils';
import { RolesEntity } from '../roles/entities/role.entity';
import { buildUserQueryBuilderWithRoles } from 'src/utils/build-query-builder';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,
    @InjectRepository(RolesEntity)
    private readonly rolesRepository: Repository<RolesEntity>,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(UsersService.name);
  }

  private parseSort(sort?: string): Record<string, 'ASC' | 'DESC'> {
    if (!sort) return { id: 'DESC' };

    const order: Record<string, 'ASC' | 'DESC'> = {};
    const fields = sort.split(',');

    fields.forEach((field) => {
      const direction = field.startsWith('-') ? 'DESC' : 'ASC';
      const key = field.replace(/^[-+]/, '');
      order[key] = direction;
      console.log({ key, direction }); // Debugging line
    });

    console.log('Parsed order:', order); // Debugging line
    this.logger.log('Parsed order:', order); // Debugging line
    return order;
  }

  async create(createUserDto: CreateUserDto) {
    const { password, roles, ...rest } = createUserDto;
    const hashPassword = await PasswordUtils.hashPassword(password);

    const newRoles = roles ?? ['USER'];
    const roleEntities = newRoles.length
      ? await this.rolesRepository.findBy({
          name: In(newRoles.map((role) => role.toUpperCase())),
        })
      : [];

    const userWithHashPassword = {
      ...rest,
      email: createUserDto.email.toLowerCase(),
      password: hashPassword,
      roles: roleEntities,
    };

    const userExists = await this.usersRepository.findOneBy({
      email: userWithHashPassword.email,
    });

    if (userExists) {
      this.logger.error('Username or email already exists', userExists.email);
      throw new HttpException('Username or email already exists', 400);
    }

    return await this.usersRepository
      .save({ ...userWithHashPassword })
      .then((res) => {
        return {
          success: true,
          message: 'User Created',
          data: res,
        };
      })
      .catch((err) => {
        this.logger.error('Error creating user', err.message);
        throw new HttpException(`Invalid data user format`, 400);
      });
  }

  async register(newUserDto: CreateUserDto) {
    return await this.create(newUserDto);
  }

  async findAll(
    filter: FilterUserDto,
  ): Promise<
    IPaginateResponse<{ id: any; username: any; email: any; roles: any[] }>
  > {
    const { page = 0, pageSize = 10, sort, fullSearch } = filter;
    const queryBuilder = buildUserQueryBuilderWithRoles({
      repository: this.usersRepository,
      filter: {
        page,
        pageSize,
        fullSearch,
        sort,
      },
      searchableFields: ['username', 'email'],
      select: ['user.id', 'user.username', 'user.email'],
      onlyWithRoles: true,
    });
    const [data, total] = await queryBuilder.getManyAndCount();
    const transformedData = data.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles?.map((role) => role.name) || [],
    }));

    return paginateResponseWithMeta(
      transformedData,
      total,
      Number(page),
      Number(pageSize),
      true,
      'Users fetched successfully',
    );
  }

  async findById(id: number): Promise<UsersEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOne(id: number) {
    return await this.usersRepository
      .findOne({ where: { id }, relations: ['roles'] })
      .then((res) => {
        return res
          ? {
              success: true,
              message: `User #${id} found`,
              data: res,
            }
          : {
              success: false,
              message: `User #${id} not found`,
              data: res,
            };
      })
      .catch((err) => {
        return {
          success: false,
          message: `User #${id} not found, ${err}`,
        };
      });
  }

  async findByEmail(
    loginDto: CreateAuthenticateDto,
    isRegister: boolean = false,
  ): Promise<UsersEntity | null> {
    const { email, password } = loginDto;
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      // relations: ['roles'],
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return null;
    if (isRegister) return user;

    const isPasswordValid = await PasswordUtils.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // throw new UnauthorizedException('Invalid credentials');
      return null;
    }

    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user ${JSON.stringify(updateUserDto)}`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}

// Implementation of IsNull function
function IsNull(): import('typeorm').FindOperator<Date> {
  return TypeOrmIsNull();
}
