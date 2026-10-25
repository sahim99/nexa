import { Controller, Request, Post, UseGuards, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(req.user);
    res.cookie('jwt', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Logged in successfully' };
  }

  @Public()
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
