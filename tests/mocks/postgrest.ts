import { vi } from 'vitest'

type QueryResult = {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number | null
}

type BuilderConfig = {
  default?: QueryResult
  single?: QueryResult
  maybeSingle?: QueryResult
}

const DEFAULT_RESULT: QueryResult = {
  data: null,
  error: null,
}

export function createBuilder(config: BuilderConfig = {}) {
  const defaultResult = config.default || DEFAULT_RESULT
  const singleResult = config.single || defaultResult
  const maybeSingleResult = config.maybeSingle || defaultResult

  const builder: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    range: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: PromiseLike<QueryResult>['then']
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(async () => singleResult),
    maybeSingle: vi.fn(async () => maybeSingleResult),
    then: (resolve, reject) => Promise.resolve(defaultResult).then(resolve, reject),
  }

  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.in.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.range.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)
  builder.update.mockReturnValue(builder)
  builder.delete.mockReturnValue(builder)
  builder.upsert.mockReturnValue(builder)

  return builder
}
