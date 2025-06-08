import { IAuthPayload } from './auth.interface';

export interface IAuthenticatedRequest {
  user: IAuthPayload;
  headers: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

export interface IFileUploadRequest {
  file: any; // Express.Multer.File type
  userId: string;
  entityType: 'aquarium' | 'event' | 'user';
  entityId: string;
}

export interface IBatchRequest<T> {
  operations: IBatchOperation<T>[];
}

export interface IBatchOperation<T> {
  method: 'create' | 'update' | 'delete';
  data: T;
  id?: string;
}