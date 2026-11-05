import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProfileStore, StoredProfile } from './profile.store.js';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileStore) {}

  @Get()
  getProfile(@Query('userId') userId?: string) {
    return {
      profile: this.profiles.get(userId || 'default'),
      persistence: 'memory',
    };
  }

  @Post()
  saveProfile(@Body() body: Partial<StoredProfile>, @Query('userId') userId?: string) {
    const profile = this.profiles.save(body || {}, userId || 'default');
    return { profile, persistence: 'memory' };
  }
}
