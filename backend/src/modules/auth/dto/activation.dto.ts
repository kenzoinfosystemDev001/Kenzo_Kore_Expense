import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CheckEmailDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class SendOtpDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  otp: string;
}

export class SetPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  verificationToken: string;

  @IsString()
  @Length(8, 64, { message: 'Password must be between 8 and 64 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}
