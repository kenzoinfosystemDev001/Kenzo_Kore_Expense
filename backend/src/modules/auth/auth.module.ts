import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { IdentityModule } from '../identity/identity.module';
import { PasswordService } from './services/password.service';
import { VerificationService } from './services/verification.service';
import { EmailService, ResendEmailProvider, SmtpEmailProvider } from './services/email.service';
import { RolesGuard } from './guards/roles.guard';
import { appConfig } from '../../config/env';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: appConfig.getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
    IdentityModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    PasswordService,
    VerificationService,
    EmailService,
    ResendEmailProvider,
    SmtpEmailProvider,
    RolesGuard,
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule,
    PasswordService,
    VerificationService,
    EmailService,
    ResendEmailProvider,
    SmtpEmailProvider,
    RolesGuard,
  ],
})
export class AuthModule {}
