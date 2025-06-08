import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaController } from './application/controllers/media.controller';
import { MediaService } from './application/services/media.service';
import { StorageService } from './infrastructure/storage/storage.service';
import { ImageProcessor } from './infrastructure/processors/image.processor';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    StorageService,
    ImageProcessor,
  ],
  exports: [MediaService, StorageService],
})
export class MediaModule {}