import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { ProxyModule } from '../../services/proxy/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [MediaController],
})
export class MediaModule {}