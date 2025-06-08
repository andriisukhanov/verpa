import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAquariumDto } from './create-aquarium.dto';

export class UpdateAquariumDto extends PartialType(
  OmitType(CreateAquariumDto, ['waterType'] as const),
) {}