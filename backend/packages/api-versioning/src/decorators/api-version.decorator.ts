import { SetMetadata } from '@nestjs/common';
import { VERSION_METADATA, VERSION_OPTIONS_METADATA } from '../utils/version.constants';
import { ApiVersionOptions } from '../utils/version.types';

export const ApiVersion = (versionOrOptions: string | string[] | ApiVersionOptions): MethodDecorator & ClassDecorator => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    let version: string | string[];
    let options: ApiVersionOptions;

    if (typeof versionOrOptions === 'string' || Array.isArray(versionOrOptions)) {
      version = versionOrOptions;
      options = { version };
    } else {
      version = versionOrOptions.version;
      options = versionOrOptions;
    }

    // Apply metadata
    if (descriptor) {
      // Method decorator
      SetMetadata(VERSION_METADATA, version)(target, propertyKey, descriptor);
      SetMetadata(VERSION_OPTIONS_METADATA, options)(target, propertyKey, descriptor);
    } else {
      // Class decorator
      SetMetadata(VERSION_METADATA, version)(target);
      SetMetadata(VERSION_OPTIONS_METADATA, options)(target);
    }
  };
};