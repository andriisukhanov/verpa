import { SetMetadata } from '@nestjs/common';
import { SKIP_API_KEY } from '../guards/api-key.guard';

export const SkipApiKey = () => SetMetadata(SKIP_API_KEY, true);