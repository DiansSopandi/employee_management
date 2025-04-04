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
import { Repository } from 'typeorm';
import { PasswordUtils } from 'src/utils/password.utils';
import { CreateAuthenticateDto } from '../auth/dto/create-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(UsersService.name);
  }

  async create(createUserDto: CreateUserDto) {
    const { password } = createUserDto;
    const hashPassword = await PasswordUtils.hashPassword(password);
    const userWithHashPassword = {
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashPassword,
    };

    const userExists = await this.usersRepository.findOneBy({
      email: userWithHashPassword.email,
    });

    if (userExists) {
      this.logger.error('User already exists', userExists.email);
      throw new HttpException('User already exists', 400);
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

  async findAll() {
    return await this.usersRepository.find().then((res) => {
      return {
        success: true,
        message: 'User Fetched',
        data: res,
      };
    });
  }

  async findById(id: number): Promise<UsersEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOne(id: number) {
    return await this.usersRepository
      .findBy({ id })
      .then((res) => {
        return res.length
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
