import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  otp: string;

  @IsString()
  @Length(8, 64, { message: 'Password must be between 8 and 64 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
