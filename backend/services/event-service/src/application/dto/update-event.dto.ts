import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(
  OmitType(CreateEventDto, ['type'] as const),
) {}