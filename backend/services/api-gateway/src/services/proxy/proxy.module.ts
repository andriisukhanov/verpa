import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyService } from './proxy.service';
import { ServiceDiscoveryService } from './service-discovery.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [HttpModule, CacheModule],
  providers: [ProxyService, ServiceDiscoveryService],
  exports: [ProxyService, ServiceDiscoveryService],
})
export class ProxyModule {}