/**
 * Creates a fresh chainable Supabase query builder mock.
 * Call mockResolve/mockReject on it to set the terminal result.
 */
export function mockQueryBuilder() {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    head: jest.fn().mockReturnThis(),
  };
  return builder;
}

export function mockResolve(builder: any, data: any, error: any = null, count: number | null = null) {
  builder.then = (resolve: any) => resolve({ data, error, count });
}

export function mockReject(builder: any, error: Error) {
  builder.then = (_: any, reject: any) => reject(error);
}

/**
 * Creates a mock supabase client with auth stubs.
 * The `from` method returns a fresh query builder each call.
 */
export function createMockSupabaseClient() {
  const client: any = {
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }),
    },
  };

  client.from = jest.fn().mockImplementation(() => mockQueryBuilder());

  return client;
}
