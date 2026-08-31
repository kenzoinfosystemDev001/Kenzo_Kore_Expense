import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { IdentityModule } from '../identity/identity.module';
import { PasswordService } from './services/password.service';
import { VerificationService } from './services/verification.service';
import { EmailService } from './services/email.service';
import { GmailApiEmailProvider } from './services/providers/gmail-api-email.provider';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'kenzo_kore_expense_secret_key_2026_production',
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
    GmailApiEmailProvider,
    RolesGuard,
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule,
    PasswordService,
    VerificationService,
    EmailService,
    GmailApiEmailProvider,
    RolesGuard,
  ],
})
export class AuthModule {}
