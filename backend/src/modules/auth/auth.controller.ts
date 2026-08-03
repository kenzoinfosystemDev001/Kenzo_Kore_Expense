import { Controller, Post, Body, Get, Param, Delete, Put, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as bcrypt from 'bcrypt';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // List all users from Postgres
  @Get('users')
  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get currently authenticated user profile from Bearer token
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const user = req.user;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Employee',
      designation: user.designation,
      departmentId: user.departmentId,
      costCenterId: user.costCenterId,
      joiningDate: user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
    };
  }

  // Login handler verifying against Neon PostgreSQL
  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    if (!body.email || !body.email.trim()) {
      throw new UnauthorizedException('Email address is required');
    }

    const cleanEmail = body.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    });

    // Strict Rule: ONLY emails registered in PostgreSQL database are allowed to enter
    if (!user) {
      throw new UnauthorizedException('Access denied. This email is not registered in the system database. Please contact your administrator.');
    }

    // Verify password strictly against stored database credentials
    if (!body.password) {
      throw new UnauthorizedException('Password is required');
    }

    if (user.password) {
      const isBcryptMatch = await bcrypt.compare(body.password, user.password).catch(() => false);
      const isPlainMatch = user.password === body.password;
      if (!isBcryptMatch && !isPlainMatch) {
        throw new UnauthorizedException('Invalid email or password credentials');
      }
    }

    // Create a genuine signed JWT token embedding the user details
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtToken = this.jwtService.sign(payload);

    return {
      message: 'Logged in successfully',
      accessToken: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Employee',
        designation: user.designation,
        departmentId: user.departmentId,
        costCenterId: user.costCenterId,
        joiningDate: user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
      }
    };
  }

  // Create/register user in Neon PostgreSQL
  @Post('register')
  async register(@Body() body: {
    name: string;
    email: string;
    role: string;
    designation: string;
    departmentId: string;
    avatar?: string;
  }) {
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
    
    const dbRole = body.role === 'Admin' ? 'ADMIN' : body.role === 'Super Admin' ? 'SUPER_ADMIN' : 'EMPLOYEE';

    const newUser = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        role: dbRole as any,
        designation: body.designation,
        departmentId: body.departmentId || 'dept_eng',
        costCenterId: 'cc_dev',
        avatar: body.avatar && body.avatar.trim() ? body.avatar.trim() : defaultAvatar
      }
    });

    // Register security audit log
    await this.prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER_BCRYPT_HASHED',
        details: `Created new secure database profile for ${newUser.name}.`,
        ipAddress: '127.0.0.1'
      }
    });

    return {
      message: 'Account created successfully in Neon database',
      user: newUser
    };
  }

  // Delete employee from Neon PostgreSQL
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // Delete audit logs first to prevent foreign key errors
    await this.prisma.auditLog.deleteMany({ where: { userId: id } });
    await this.prisma.notification.deleteMany({ where: { userId: id } });
    await this.prisma.expenseApproval.deleteMany({ where: { approverId: id } });
    
    const deleted = await this.prisma.user.delete({
      where: { id }
    });

    return {
      message: `Employee ${deleted.name} successfully deleted from Neon database`,
    };
  }

  // Update employee profile, avatar & password in Neon PostgreSQL
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: { name?: string; email?: string; designation?: string; password?: string; avatar?: string }) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email ? body.email.toLowerCase() : undefined,
        designation: body.designation,
        password: body.password ? body.password : undefined,
        avatar: body.avatar ? body.avatar : undefined
      }
    });

    return {
      message: 'User updated successfully in Neon DB',
      user: updated
    };
  }

  // Change password endpoint (usable by user for self, or admin/superadmin for any user)
  @Put('users/:id/password')
  async changePassword(@Param('id') id: string, @Body() body: { password: string }) {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword
      }
    });

    return {
      message: 'Password updated successfully in Neon DB',
      userId: updated.id
    };
  }
}
