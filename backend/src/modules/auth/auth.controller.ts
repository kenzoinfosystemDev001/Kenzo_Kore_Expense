import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { IdentityService } from '../identity/identity.service';
import { PasswordService } from './services/password.service';
import { VerificationService } from './services/verification.service';
import {
  CheckEmailDto,
  SendOtpDto,
  VerifyOtpDto,
  SetPasswordDto,
} from './dto/activation.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly identityService: IdentityService,
    private readonly passwordService: PasswordService,
    private readonly verificationService: VerificationService,
  ) {}

  // ==========================================
  // FLOW 1: ACCOUNT ACTIVATION PIPELINE
  // ==========================================

  /**
   * Step 1: Check Employee Eligibility against Master Identity Directory (Google Workspace / SCIM)
   */
  @Post('activation/check-email')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async checkEligibility(@Body() dto: CheckEmailDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const result = await this.identityService.verifyEmployeeEligibility(cleanEmail);

    if (!result.isEligible) {
      if (result.status === 'NOT_FOUND') {
        throw new NotFoundException(
          'This email is not registered in the company master employee directory. Please contact HR or IT administrators.'
        );
      }
      if (result.status === 'SUSPENDED') {
        throw new ForbiddenException(
          'Your employee directory account is currently inactive or suspended. Access is restricted.'
        );
      }
      if (result.status === 'ALREADY_ACTIVATED') {
        return {
          eligible: false,
          status: 'ALREADY_ACTIVATED',
          message: 'Your account is already activated. Please sign in with your password.',
          name: result.employee?.displayName,
          email: cleanEmail,
        };
      }
      throw new BadRequestException(result.reason || 'Account activation is not available for this email.');
    }

    return {
      eligible: true,
      status: 'ELIGIBLE',
      message: 'Employee verified in Google Workspace directory. Ready for email ownership verification.',
      employee: {
        email: result.employee?.primaryEmail,
        name: result.employee?.displayName,
        department: result.employee?.department || 'General',
        jobTitle: result.employee?.jobTitle || 'Staff',
      },
    };
  }

  /**
   * Step 2: Send OTP Challenge to Corporate Email Inbox
   */
  @Post('activation/send-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async sendActivationOtp(@Body() dto: SendOtpDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // Verify employee eligibility first
    const eligibility = await this.identityService.verifyEmployeeEligibility(cleanEmail);
    if (!eligibility.isEligible && eligibility.status !== 'ELIGIBLE') {
      if (eligibility.status === 'ALREADY_ACTIVATED') {
        throw new BadRequestException('Account already activated. Please log in.');
      }
      throw new ForbiddenException('Employee is not eligible for account activation.');
    }

    const challenge = await this.verificationService.createChallenge(cleanEmail, 'ACTIVATION');

    // Register audit log
    await this.prisma.auditLog.create({
      data: {
        userId: eligibility.employee?.externalDirectoryId || 'system',
        action: 'ACTIVATION_OTP_DISPATCHED',
        details: `Dispatched 6-digit activation challenge to ${cleanEmail}`,
        ipAddress: ip || '127.0.0.1',
      },
    }).catch(() => null);

    return challenge;
  }

  /**
   * Step 3: Verify OTP Challenge submitted by user
   */
  @Post('activation/verify-otp')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verifyActivationOtp(@Body() dto: VerifyOtpDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const result = await this.verificationService.verifyChallenge(cleanEmail, dto.otp, 'ACTIVATION');

    return {
      success: true,
      message: 'Email ownership verified successfully.',
      verificationToken: result.token,
      email: cleanEmail,
    };
  }

  /**
   * Step 4: Create Password & Complete Account Activation
   */
  @Post('activation/set-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async completeActivation(@Body() dto: SetPasswordDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Verify stage token
    const isTokenValid = this.verificationService.validateStageToken(
      dto.verificationToken,
      cleanEmail,
      'ACTIVATION'
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid or expired verification session token. Please re-verify your email.');
    }

    // 2. Lookup Master Directory record
    const directoryEmp = await this.identityService.getEmployeeByEmail(cleanEmail);
    if (!directoryEmp) {
      throw new NotFoundException('Employee identity record not found in master directory.');
    }

    if (directoryEmp.status !== 'ACTIVE') {
      throw new ForbiddenException('Employee directory status is not active.');
    }

    // 3. Validate & Hash Password with Bcrypt 12
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 4. Ensure master directory record is linked
    const masterIdentity = await this.prisma.employeeIdentity.findUnique({
      where: { primaryEmail: cleanEmail },
    });

    // Find default department & cost center if not assigned
    const defaultDept = await this.prisma.department.findFirst() || { id: 'dept_eng' };
    const defaultCostCenter = await this.prisma.costCenter.findFirst() || { id: 'cc_dev' };

    // 5. Create or Update User record
    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    let activatedUser;
    if (existingUser) {
      activatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          status: 'ACTIVE',
          employeeIdentityId: masterIdentity?.id || undefined,
          emailVerifiedAt: new Date(),
          activatedAt: new Date(),
        },
      });
    } else {
      activatedUser = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: directoryEmp.displayName,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          designation: directoryEmp.jobTitle || 'Corporate Staff',
          departmentId: defaultDept.id,
          costCenterId: defaultCostCenter.id,
          employeeIdentityId: masterIdentity?.id || undefined,
          emailVerifiedAt: new Date(),
          activatedAt: new Date(),
        },
      });
    }

    // 6. Generate signed JWT session
    const payload = { sub: activatedUser.id, email: activatedUser.email, role: activatedUser.role };
    const accessToken = this.jwtService.sign(payload);

    // 7. Security Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: activatedUser.id,
        action: 'ACCOUNT_ACTIVATED',
        details: `Employee account activated with secure password and linked to Google/SCIM identity ${directoryEmp.externalDirectoryId}`,
        ipAddress: ip || '127.0.0.1',
      },
    }).catch(() => null);

    return {
      message: 'Account activated successfully. Welcome to Kenzo Kore Expense!',
      accessToken,
      user: {
        id: activatedUser.id,
        name: activatedUser.name,
        email: activatedUser.email,
        role: activatedUser.role === 'SUPER_ADMIN' ? 'Super Admin' : activatedUser.role === 'ADMIN' ? 'Admin' : 'Employee',
        designation: activatedUser.designation,
        departmentId: activatedUser.departmentId,
        costCenterId: activatedUser.costCenterId,
        joiningDate: activatedUser.joiningDate ? activatedUser.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        avatar: activatedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      },
    };
  }

  // ==========================================
  // AUTHENTICATION & LOGIN
  // ==========================================

  /**
   * Enterprise Login Handler
   */
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Fetch User Record
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      include: { employeeIdentity: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid corporate email or credentials. If you are a new employee, please use "Activate Account".');
    }

    // 2. Verify account is not deactivated/suspended in Application
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new UnauthorizedException('Your access to Kenzo Kore Expense has been suspended by your administrator.');
    }

    // 3. Verify Master Directory status (Google Workspace / SCIM sync check)
    if (user.employeeIdentity && user.employeeIdentity.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your company Google Workspace identity is suspended. Access denied.');
    }

    // 4. Verify password hash using Bcrypt
    if (!user.passwordHash) {
      throw new UnauthorizedException('Account not yet activated. Please click "Activate Account" to set up your password.');
    }

    const isMatch = await this.passwordService.comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate signed JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // 6. Security Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN_SUCCESS',
        details: `Authenticated user session with signed JWT. Bcrypt check passed.`,
        ipAddress: ip || '127.0.0.1',
      },
    }).catch(() => null);

    return {
      message: 'Logged in successfully',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'Employee',
        designation: user.designation,
        departmentId: user.departmentId,
        costCenterId: user.costCenterId,
        joiningDate: user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      },
    };
  }

  // ==========================================
  // PASSWORD RESET / FORGOT PASSWORD
  // ==========================================

  @Post('forgot-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });

    if (!user) {
      // Do not reveal email existence to prevent user enumeration
      return {
        success: true,
        message: `If an account exists for ${cleanEmail}, a verification code has been dispatched.`,
      };
    }

    const challenge = await this.verificationService.createChallenge(cleanEmail, 'PASSWORD_RESET');
    return challenge;
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Verify OTP
    await this.verificationService.verifyChallenge(cleanEmail, dto.otp, 'PASSWORD_RESET');

    // 2. Hash new password
    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);

    // 3. Update User
    const updated = await this.prisma.user.update({
      where: { email: cleanEmail },
      data: { passwordHash },
    });

    // 4. Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: updated.id,
        action: 'PASSWORD_RESET_COMPLETED',
        details: `User completed self-service password reset via OTP verification.`,
        ipAddress: ip || '127.0.0.1',
      },
    }).catch(() => null);

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new credentials.',
    };
  }

  // ==========================================
  // USER PROFILE & DIRECTORY STATUS
  // ==========================================

  /**
   * Get currently authenticated user profile
   */
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
      avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    };
  }

  /**
   * List all users from PostgreSQL database (protected with JWT Auth)
   */
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        costCenterId: true,
        joiningDate: true,
        avatar: true,
        status: true,
        activatedAt: true,
      },
    });
  }

  /**
   * Register a new employee (Admin/SuperAdmin endpoint)
   * Creates an unactivated user / EmployeeIdentity and automatically dispatches an activation OTP to the employee's registered email
   */
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async registerEmployee(@Body() body: any) {
    const cleanEmail = body.email.trim().toLowerCase();

    // Check if user already exists and active
    const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing && existing.status === 'ACTIVE' && existing.passwordHash) {
      throw new BadRequestException('A user with this email address already exists and is active.');
    }

    // Resolve Department & Cost Center
    const defaultDept = await this.prisma.department.findFirst() || { id: 'dept_eng', name: 'Operations' };
    const defaultCostCenter = await this.prisma.costCenter.findFirst() || { id: 'cc_dev', name: 'Corporate' };

    // Upsert EmployeeIdentity
    const identity = await this.prisma.employeeIdentity.upsert({
      where: { primaryEmail: cleanEmail },
      update: {
        displayName: body.name,
        jobTitle: body.designation || 'Corporate Staff',
        department: defaultDept.name,
        costCenter: defaultCostCenter.name,
        status: 'ACTIVE',
      },
      create: {
        externalDirectoryId: `reg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        primaryEmail: cleanEmail,
        displayName: body.name,
        firstName: body.name.split(' ')[0] || 'Employee',
        lastName: body.name.split(' ').slice(1).join(' ') || '',
        jobTitle: body.designation || 'Corporate Staff',
        department: defaultDept.name,
        costCenter: defaultCostCenter.name,
        status: 'ACTIVE',
        source: 'MANUAL_SYNC',
      },
    });

    // Create user in PENDING_ACTIVATION state
    const user = await this.prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        name: body.name,
        designation: body.designation || 'Corporate Staff',
        role: body.role === 'ADMIN' ? 'ADMIN' : body.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'EMPLOYEE',
        avatar: body.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        employeeIdentityId: identity.id,
      },
      create: {
        email: cleanEmail,
        name: body.name,
        designation: body.designation || 'Corporate Staff',
        role: body.role === 'ADMIN' ? 'ADMIN' : body.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'EMPLOYEE',
        avatar: body.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        status: 'PENDING_ACTIVATION',
        departmentId: defaultDept.id,
        costCenterId: defaultCostCenter.id,
        employeeIdentityId: identity.id,
      },
    });

    // Send activation OTP email to the registered email address
    await this.verificationService.createChallenge(cleanEmail, 'ACTIVATION').catch(() => null);

    return {
      message: `Employee ${user.name} successfully registered. Activation OTP dispatched to ${cleanEmail}.`,
      user,
    };
  }

  /**
   * Check Directory Sync and Integration Health
   */
  @Get('directory-status')
  async getDirectoryStatus() {
    return this.identityService.getDirectoryStatus();
  }

  /**
   * Change password endpoint for logged-in user
   */
  @Put('users/:id/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Param('id') id: string, @Body() body: { password: string }, @Req() req: any) {
    if (req.user.id !== id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('You are not authorized to modify another user credentials.');
    }

    const passwordHash = await this.passwordService.hashPassword(body.password);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      message: 'Password updated successfully',
      userId: id,
    };
  }

  /**
   * Update profile/avatar for user
   */
  @Put('users/:id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; designation?: string; avatar?: string },
    @Req() req: any,
  ) {
    if (req.user.id !== id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('You are not authorized to modify another user profile.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        designation: body.designation,
        avatar: body.avatar,
      },
    });

    return {
      message: 'User updated successfully',
      user: updated,
    };
  }

  /**
   * Delete employee (Admin/SuperAdmin only)
   */
  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteUser(@Param('id') id: string) {
    await this.prisma.auditLog.deleteMany({ where: { userId: id } });
    await this.prisma.notification.deleteMany({ where: { userId: id } });
    await this.prisma.expenseApproval.deleteMany({ where: { approverId: id } });

    const deleted = await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: `Employee ${deleted.name} removed from system`,
    };
  }
}
