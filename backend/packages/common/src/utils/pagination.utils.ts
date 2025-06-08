import { IPaginationQuery, IPaginationMeta, IPaginatedResponse } from '../interfaces';
import { APP_CONSTANTS } from '../constants';

export class PaginationUtils {
  static normalizePaginationQuery(query: IPaginationQuery): Required<IPaginationQuery> {
    return {
      page: Math.max(1, query.page || APP_CONSTANTS.PAGINATION.DEFAULT_PAGE),
      limit: Math.min(
        Math.max(1, query.limit || APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT),
        APP_CONSTANTS.PAGINATION.MAX_LIMIT
      ),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      search: query.search || '',
      filters: query.filters || {},
    };
  }

  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createPaginationMeta(
    page: number,
    limit: number,
    totalItems: number
  ): IPaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      currentPage: page,
      totalPages,
      pageSize: limit,
      totalItems,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  static createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    totalItems: number
  ): IPaginatedResponse<T> {
    return {
      data,
      meta: this.createPaginationMeta(page, limit, totalItems),
    };
  }

  static buildSortObject(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, 1 | -1> {
    const sortValue = sortOrder === 'asc' ? 1 : -1;
    
    // Handle nested fields (e.g., 'user.name')
    const fields = sortBy.split(',').map((field) => field.trim());
    const sortObject: Record<string, 1 | -1> = {};
    
    fields.forEach((field) => {
      if (field) {
        sortObject[field] = sortValue;
      }
    });
    
    return sortObject;
  }

  static buildFilterQuery(filters: Record<string, unknown>): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle different filter types
        if (Array.isArray(value)) {
          query[key] = { $in: value };
        } else if (typeof value === 'string' && value.includes(',')) {
          // Handle comma-separated values
          query[key] = { $in: value.split(',').map((v) => v.trim()) };
        } else if (typeof value === 'object' && value !== null) {
          // Handle complex filters (e.g., date ranges)
          query[key] = value;
        } else {
          query[key] = value;
        }
      }
    });
    
    return query;
  }

  static buildSearchQuery(search: string, searchFields: string[]): Record<string, unknown> {
    if (!search || searchFields.length === 0) {
      return {};
    }
    
    const searchRegex = new RegExp(search, 'i');
    
    return {
      $or: searchFields.map((field) => ({ [field]: searchRegex })),
    };
  }

  static mergePaginationQueries(...queries: Record<string, unknown>[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    
    queries.forEach((query) => {
      if (query['$or'] && merged['$or']) {
        // Merge $or conditions
        merged['$and'] = [{ $or: merged['$or'] }, { $or: query['$or'] }];
        delete merged['$or'];
      } else {
        Object.assign(merged, query);
      }
    });
    
    return merged;
  }
}