import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { GoogleDirectoryProvider } from './providers/google-directory.provider';
import { ScimProvider } from './providers/scim.provider';
import { IdentityService } from './identity.service';
import { ScimController } from './scim.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ScimController],
  providers: [GoogleDirectoryProvider, ScimProvider, IdentityService],
  exports: [IdentityService, GoogleDirectoryProvider, ScimProvider],
})
export class IdentityModule {}
