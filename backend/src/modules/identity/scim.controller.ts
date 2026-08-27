import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  NotFoundException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ScimProvider, ScimUserResource } from './providers/scim.provider';
import { PrismaService } from '../../database/prisma.service';

@Controller('api/v1/scim/v2')
export class ScimController {
  constructor(
    private readonly scimProvider: ScimProvider,
    private readonly prisma: PrismaService,
  ) {}

  private validateScimAuth(authHeader?: string) {
    const configuredToken = process.env.SCIM_BEARER_TOKEN || 'kenzo_scim_provisioning_key_2026';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid SCIM Authorization Header');
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== configuredToken) {
      throw new UnauthorizedException('Unauthorized SCIM Bearer Token');
    }
  }

  // SCIM 2.0 List Users
  @Get('Users')
  async listUsers(
    @Headers('authorization') auth?: string,
    @Query('startIndex') startIndex = '1',
    @Query('count') count = '100',
    @Query('filter') filter?: string,
  ) {
    this.validateScimAuth(auth);

    const identities = await this.prisma.employeeIdentity.findMany({
      take: parseInt(count, 10),
      skip: Math.max(0, parseInt(startIndex, 10) - 1),
      orderBy: { createdAt: 'desc' },
    });

    const totalResults = await this.prisma.employeeIdentity.count();

    const resources = identities.map((id) => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: id.externalDirectoryId,
      externalId: id.externalDirectoryId,
      userName: id.primaryEmail,
      name: {
        formatted: id.displayName,
        familyName: id.lastName,
        givenName: id.firstName,
      },
      emails: [{ value: id.primaryEmail, primary: true }],
      active: id.status === 'ACTIVE',
      title: id.jobTitle,
      department: id.department,
      meta: {
        resourceType: 'User',
        created: id.createdAt.toISOString(),
        lastModified: id.updatedAt.toISOString(),
      },
    }));

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults,
      itemsPerPage: resources.length,
      startIndex: parseInt(startIndex, 10),
      Resources: resources,
    };
  }

  // SCIM 2.0 Get User by ID
  @Get('Users/:id')
  async getUser(@Param('id') id: string, @Headers('authorization') auth?: string) {
    this.validateScimAuth(auth);

    const record = await this.prisma.employeeIdentity.findUnique({
      where: { externalDirectoryId: id },
    });

    if (!record) {
      throw new NotFoundException({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: `User with external ID "${id}" not found`,
        status: '404',
      });
    }

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: record.externalDirectoryId,
      externalId: record.externalDirectoryId,
      userName: record.primaryEmail,
      name: {
        formatted: record.displayName,
        familyName: record.lastName,
        givenName: record.firstName,
      },
      emails: [{ value: record.primaryEmail, primary: true }],
      active: record.status === 'ACTIVE',
      title: record.jobTitle,
      department: record.department,
      meta: {
        resourceType: 'User',
        created: record.createdAt.toISOString(),
        lastModified: record.updatedAt.toISOString(),
      },
    };
  }

  // SCIM 2.0 Create / Provision User
  @Post('Users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() body: ScimUserResource, @Headers('authorization') auth?: string) {
    this.validateScimAuth(auth);
    const identity = await this.scimProvider.provisionUser(body);

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: identity.externalDirectoryId,
      externalId: identity.externalDirectoryId,
      userName: identity.primaryEmail,
      name: {
        formatted: identity.displayName,
        familyName: identity.lastName,
        givenName: identity.firstName,
      },
      emails: [{ value: identity.primaryEmail, primary: true }],
      active: identity.status === 'ACTIVE',
      title: identity.jobTitle,
      department: identity.department,
      meta: {
        resourceType: 'User',
        created: identity.createdAt.toISOString(),
        lastModified: identity.updatedAt.toISOString(),
      },
    };
  }

  // SCIM 2.0 Update User
  @Put('Users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: ScimUserResource,
    @Headers('authorization') auth?: string,
  ) {
    this.validateScimAuth(auth);
    body.externalId = id;
    const identity = await this.scimProvider.provisionUser(body);

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: identity.externalDirectoryId,
      externalId: identity.externalDirectoryId,
      userName: identity.primaryEmail,
      name: {
        formatted: identity.displayName,
        familyName: identity.lastName,
        givenName: identity.firstName,
      },
      emails: [{ value: identity.primaryEmail, primary: true }],
      active: identity.status === 'ACTIVE',
      title: identity.jobTitle,
      department: identity.department,
      meta: {
        resourceType: 'User',
        created: identity.createdAt.toISOString(),
        lastModified: identity.updatedAt.toISOString(),
      },
    };
  }

  // SCIM 2.0 Deprovision / Delete User
  @Delete('Users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Headers('authorization') auth?: string) {
    this.validateScimAuth(auth);

    const identity = await this.prisma.employeeIdentity.update({
      where: { externalDirectoryId: id },
      data: { status: 'DEPROVISIONED' },
    });

    if (identity) {
      await this.prisma.user.updateMany({
        where: { employeeIdentityId: identity.id },
        data: { status: 'DEACTIVATED' },
      });
    }

    return;
  }
}
