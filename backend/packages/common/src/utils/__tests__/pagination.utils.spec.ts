import { PaginationUtils } from '../pagination.utils';
import { IPaginationQuery } from '../../interfaces';
import { APP_CONSTANTS } from '../../constants';

describe('PaginationUtils', () => {
  describe('normalizePaginationQuery', () => {
    it('should use default values when not provided', () => {
      const result = PaginationUtils.normalizePaginationQuery({});
      
      expect(result.page).toBe(APP_CONSTANTS.PAGINATION.DEFAULT_PAGE);
      expect(result.limit).toBe(APP_CONSTANTS.PAGINATION.DEFAULT_LIMIT);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
      expect(result.search).toBe('');
      expect(result.filters).toEqual({});
    });

    it('should use provided values', () => {
      const query: IPaginationQuery = {
        page: 5,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        search: 'test',
        filters: { status: 'active' },
      };
      
      const result = PaginationUtils.normalizePaginationQuery(query);
      
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
      expect(result.search).toBe('test');
      expect(result.filters).toEqual({ status: 'active' });
    });

    it('should enforce minimum page number', () => {
      const result = PaginationUtils.normalizePaginationQuery({ page: 0 });
      expect(result.page).toBe(1);
      
      const result2 = PaginationUtils.normalizePaginationQuery({ page: -5 });
      expect(result2.page).toBe(1);
    });

    it('should enforce limit boundaries', () => {
      const result1 = PaginationUtils.normalizePaginationQuery({ limit: 0 });
      expect(result1.limit).toBe(1);
      
      const result2 = PaginationUtils.normalizePaginationQuery({ limit: 200 });
      expect(result2.limit).toBe(APP_CONSTANTS.PAGINATION.MAX_LIMIT);
    });
  });

  describe('calculateSkip', () => {
    it('should calculate skip correctly', () => {
      expect(PaginationUtils.calculateSkip(1, 20)).toBe(0);
      expect(PaginationUtils.calculateSkip(2, 20)).toBe(20);
      expect(PaginationUtils.calculateSkip(3, 20)).toBe(40);
      expect(PaginationUtils.calculateSkip(5, 10)).toBe(40);
    });
  });

  describe('createPaginationMeta', () => {
    it('should create correct pagination metadata', () => {
      const meta = PaginationUtils.createPaginationMeta(2, 20, 95);
      
      expect(meta.currentPage).toBe(2);
      expect(meta.pageSize).toBe(20);
      expect(meta.totalItems).toBe(95);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrevious).toBe(true);
    });

    it('should handle first page', () => {
      const meta = PaginationUtils.createPaginationMeta(1, 20, 50);
      
      expect(meta.hasPrevious).toBe(false);
      expect(meta.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const meta = PaginationUtils.createPaginationMeta(3, 20, 60);
      
      expect(meta.hasPrevious).toBe(true);
      expect(meta.hasNext).toBe(false);
    });

    it('should handle single page', () => {
      const meta = PaginationUtils.createPaginationMeta(1, 20, 15);
      
      expect(meta.totalPages).toBe(1);
      expect(meta.hasPrevious).toBe(false);
      expect(meta.hasNext).toBe(false);
    });

    it('should handle empty results', () => {
      const meta = PaginationUtils.createPaginationMeta(1, 20, 0);
      
      expect(meta.totalPages).toBe(0);
      expect(meta.hasPrevious).toBe(false);
      expect(meta.hasNext).toBe(false);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with data', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = PaginationUtils.createPaginatedResponse(data, 1, 10, 3);
      
      expect(response.data).toEqual(data);
      expect(response.meta.currentPage).toBe(1);
      expect(response.meta.totalItems).toBe(3);
    });
  });

  describe('buildSortObject', () => {
    it('should build sort object for single field', () => {
      expect(PaginationUtils.buildSortObject('name', 'asc')).toEqual({ name: 1 });
      expect(PaginationUtils.buildSortObject('createdAt', 'desc')).toEqual({ createdAt: -1 });
    });

    it('should handle multiple fields', () => {
      const result = PaginationUtils.buildSortObject('name,createdAt', 'asc');
      expect(result).toEqual({ name: 1, createdAt: 1 });
    });

    it('should handle fields with spaces', () => {
      const result = PaginationUtils.buildSortObject('name , createdAt , updatedAt', 'desc');
      expect(result).toEqual({ name: -1, createdAt: -1, updatedAt: -1 });
    });

    it('should ignore empty fields', () => {
      const result = PaginationUtils.buildSortObject('name,,createdAt,', 'asc');
      expect(result).toEqual({ name: 1, createdAt: 1 });
    });
  });

  describe('buildFilterQuery', () => {
    it('should handle simple filters', () => {
      const filters = {
        status: 'active',
        type: 'premium',
      };
      
      const result = PaginationUtils.buildFilterQuery(filters);
      
      expect(result).toEqual({
        status: 'active',
        type: 'premium',
      });
    });

    it('should handle array filters', () => {
      const filters = {
        status: ['active', 'pending'],
      };
      
      const result = PaginationUtils.buildFilterQuery(filters);
      
      expect(result).toEqual({
        status: { $in: ['active', 'pending'] },
      });
    });

    it('should handle comma-separated string as array', () => {
      const filters = {
        status: 'active,pending,completed',
      };
      
      const result = PaginationUtils.buildFilterQuery(filters);
      
      expect(result).toEqual({
        status: { $in: ['active', 'pending', 'completed'] },
      });
    });

    it('should handle complex object filters', () => {
      const filters = {
        createdAt: { $gte: new Date('2024-01-01'), $lt: new Date('2024-02-01') },
      };
      
      const result = PaginationUtils.buildFilterQuery(filters);
      
      expect(result).toEqual(filters);
    });

    it('should ignore null, undefined, and empty values', () => {
      const filters = {
        status: 'active',
        type: null,
        category: undefined,
        name: '',
        valid: 0,
        enabled: false,
      };
      
      const result = PaginationUtils.buildFilterQuery(filters);
      
      expect(result).toEqual({
        status: 'active',
        valid: 0,
        enabled: false,
      });
    });
  });

  describe('buildSearchQuery', () => {
    it('should build search query for multiple fields', () => {
      const result = PaginationUtils.buildSearchQuery('test', ['name', 'description']);
      
      expect(result).toEqual({
        $or: [
          { name: /test/i },
          { description: /test/i },
        ],
      });
    });

    it('should return empty object when no search term', () => {
      const result = PaginationUtils.buildSearchQuery('', ['name', 'description']);
      expect(result).toEqual({});
    });

    it('should return empty object when no search fields', () => {
      const result = PaginationUtils.buildSearchQuery('test', []);
      expect(result).toEqual({});
    });

    it('should handle special regex characters in search', () => {
      const result = PaginationUtils.buildSearchQuery('test.*', ['name']);
      
      // The regex should include the literal characters
      expect(result.$or[0].name.source).toContain('test.*');
    });
  });

  describe('mergePaginationQueries', () => {
    it('should merge simple queries', () => {
      const query1 = { status: 'active' };
      const query2 = { type: 'premium' };
      
      const result = PaginationUtils.mergePaginationQueries(query1, query2);
      
      expect(result).toEqual({
        status: 'active',
        type: 'premium',
      });
    });

    it('should handle $or conditions properly', () => {
      const query1 = { $or: [{ name: /test/i }, { description: /test/i }] };
      const query2 = { status: 'active' };
      
      const result = PaginationUtils.mergePaginationQueries(query1, query2);
      
      expect(result).toEqual({
        $or: [{ name: /test/i }, { description: /test/i }],
        status: 'active',
      });
    });

    it('should combine multiple $or conditions with $and', () => {
      const query1 = { $or: [{ name: /test/i }] };
      const query2 = { $or: [{ status: 'active' }] };
      
      const result = PaginationUtils.mergePaginationQueries(query1, query2);
      
      expect(result).toEqual({
        $and: [
          { $or: [{ name: /test/i }] },
          { $or: [{ status: 'active' }] },
        ],
      });
    });

    it('should handle empty queries', () => {
      const result = PaginationUtils.mergePaginationQueries({}, { status: 'active' }, {});
      
      expect(result).toEqual({ status: 'active' });
    });

    it('should override duplicate keys', () => {
      const query1 = { status: 'active', type: 'basic' };
      const query2 = { status: 'inactive' };
      
      const result = PaginationUtils.mergePaginationQueries(query1, query2);
      
      expect(result).toEqual({
        status: 'inactive',
        type: 'basic',
      });
    });
  });
});