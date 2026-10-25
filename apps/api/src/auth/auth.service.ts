import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const adminUser = process.env.NEXA_ADMIN_USER || 'admin';
    const adminPass = process.env.NEXA_ADMIN_PASS || 'admin';

    if (username === adminUser && pass === adminPass) {
      return { userId: '1', username };
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
