import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { ProxyModule } from '../../services/proxy/proxy.module';
import { CacheModule } from '../../services/cache/cache.module';

@Module({
  imports: [ProxyModule, CacheModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}