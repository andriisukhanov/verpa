import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersV2Controller } from './users-v2.controller';
import { ProxyModule } from '../../services/proxy/proxy.module';
import { CacheModule } from '../../services/cache/cache.module';

@Module({
  imports: [ProxyModule, CacheModule],
  controllers: [UsersController, UsersV2Controller],
})
export class UsersModule {}