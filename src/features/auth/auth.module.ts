import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionSerializer } from './session.serializer';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpCodesWhatsappEntity } from '../whatsapp/entities/otp-codes-whatsapp.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    UsersModule,
    AuditTrailModule,
    PassportModule,
    WhatsappModule,
    TypeOrmModule.forFeature([OtpCodesWhatsappEntity]),
    PassportModule.register({ session: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalAuthGuard,
    JwtAuthGuard,
    JwtStrategy,
    LocalStrategy,
    SessionSerializer,
    Logger,
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
