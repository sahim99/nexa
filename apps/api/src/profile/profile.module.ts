import { Global, Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileStore } from './profile.store.js';

@Global()
@Module({
  controllers: [ProfileController],
  providers: [ProfileStore],
  exports: [ProfileStore],
})
export class ProfileModule {}
