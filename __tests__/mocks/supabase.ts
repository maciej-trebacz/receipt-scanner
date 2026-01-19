/**
 * In-memory mock for Supabase client.
 * Provides a simple map-based storage for testing.
 */

export interface MockSupabaseData {
  receipts: Map<string, Record<string, unknown>>;
  receiptItems: Map<string, Record<string, unknown>>;
  categories: Map<string, Record<string, unknown>>;
  users: Map<string, Record<string, unknown>>;
}

export function createMockSupabaseData(): MockSupabaseData {
  return {
    receipts: new Map(),
    receiptItems: new Map(),
    categories: new Map(),
    users: new Map(),
  };
}

type TableName = keyof MockSupabaseData;

export function createMockSupabaseClient(data: MockSupabaseData = createMockSupabaseData()) {
  const createQueryBuilder = (table: TableName) => {
    let filters: Array<{ column: string; value: unknown }> = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let limitCount: number | null = null;

    const applyFilters = (items: Record<string, unknown>[]) => {
      let result = [...items];
      for (const filter of filters) {
        result = result.filter((item) => item[filter.column] === filter.value);
      }
      if (orderBy) {
        result.sort((a, b) => {
          const aVal = a[orderBy!.column];
          const bVal = b[orderBy!.column];
          if (aVal === bVal) return 0;
          const cmp = aVal! < bVal! ? -1 : 1;
          return orderBy!.ascending ? cmp : -cmp;
        });
      }
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }
      return result;
    };

    const builder = {
      select: (_columns = "*") => builder,
      insert: (row: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(row) ? row : [row];
        for (const r of rows) {
          const id = (r.id as string) || crypto.randomUUID();
          data[table].set(id, { ...r, id });
        }
        return { data: rows, error: null };
      },
      update: (updates: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => {
          const items = Array.from(data[table].values());
          const item = items.find((i) => i[column] === value);
          if (item) {
            const updated = { ...item, ...updates };
            data[table].set(item.id as string, updated);
            return { data: updated, error: null };
          }
          return { data: null, error: { message: "Not found" } };
        },
        match: (criteria: Record<string, unknown>) => {
          const items = Array.from(data[table].values());
          for (const item of items) {
            const matches = Object.entries(criteria).every(
              ([k, v]) => item[k] === v
            );
            if (matches) {
              const updated = { ...item, ...updates };
              data[table].set(item.id as string, updated);
            }
          }
          return { data: null, error: null };
        },
      }),
      delete: () => ({
        eq: (column: string, value: unknown) => {
          const items = Array.from(data[table].entries());
          for (const [id, item] of items) {
            if (item[column] === value) {
              data[table].delete(id);
            }
          }
          return { data: null, error: null };
        },
      }),
      eq: (column: string, value: unknown) => {
        filters.push({ column, value });
        return builder;
      },
      order: (column: string, { ascending = true } = {}) => {
        orderBy = { column, ascending };
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      single: () => {
        const items = applyFilters(Array.from(data[table].values()));
        return { data: items[0] || null, error: items[0] ? null : { message: "Not found" } };
      },
      then: (resolve: (result: { data: unknown[]; error: null }) => void) => {
        const items = applyFilters(Array.from(data[table].values()));
        resolve({ data: items, error: null });
      },
    };

    return builder;
  };

  return {
    from: (table: string) => createQueryBuilder(table as TableName),
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: unknown) => ({
          data: { path: _path },
          error: null,
        }),
        download: async (_path: string) => ({
          data: new Blob(),
          error: null,
        }),
        remove: async (_paths: string[]) => ({
          data: null,
          error: null,
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/receipts/${path}` },
        }),
      }),
    },
  };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
