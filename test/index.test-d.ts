import { expectType, expectError } from 'tsd'
import openkey = require('..')

// Mock Redis client for testing
const redis = {
  get: async (key: string) => null as string | null,
  set: async (key: string, value: string, ...args: any[]) => 'OK',
  del: async (key: string) => 1,
  keys: async (pattern: string) => [] as string[],
  mget: async (...keys: string[]) => [] as (string | null)[],
  eval: async (script: string, numKeys: number, ...args: (string | number)[]) => 0,
  scanStream: (options: { match: string }) => ({})
}

// Test main factory function
const instance = openkey({ redis, prefix: 'test:' })
expectType<ReturnType<typeof openkey>>(instance)

// Test without options (should use defaults)
const defaultInstance = openkey()
expectType<ReturnType<typeof openkey>>(defaultInstance)

// Test with custom serialization
const customInstance = openkey({
  redis,
  serialize: async (data: any) => JSON.stringify(data),
  deserialize: async (data: string) => JSON.parse(data)
})

// Test Plans API
const { plans } = instance

// Test plan creation
expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(plans.create({
  id: 'test-plan',
  limit: 1000,
  period: '30d'
}))

// Test plan creation with metadata
expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(plans.create({
  id: 'test-plan-with-metadata',
  limit: 500,
  period: '7d',
  metadata: {
    name: 'Test Plan',
    tier: 'premium',
    active: true,
    priority: 1
  }
}))

// Test plan creation should error without required fields
expectError(plans.create({}))
expectError(plans.create({ id: 'test' }))
expectError(plans.create({ limit: 100 }))

// Test plan retrieval
expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
} | null>>(plans.retrieve('test-plan'))

expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
} | null>>(plans.retrieve('test-plan', { throwError: false }))

// Test plan update
expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(plans.update('test-plan', { limit: 2000 }))

expectType<Promise<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(plans.update('test-plan', {
  limit: 2000,
  period: '60d',
  metadata: { updated: true }
}))

// Test plan deletion
expectType<Promise<boolean>>(plans.del('test-plan'))

// Test plans list
expectType<Promise<Array<{
  id: string
  limit: number
  period: string
  createdAt: number
  updatedAt: number
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>>(plans.list())

// Test Keys API
const { keys } = instance

// Test key creation
expectType<Promise<{
  value: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  plan?: string
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(keys.create())

expectType<Promise<{
  value: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  plan?: string
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(keys.create({
  value: 'custom-key-value',
  enabled: true,
  plan: 'test-plan',
  metadata: { user: 'test@example.com' }
}))

// Test key retrieval
expectType<Promise<{
  value: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  plan?: string
  metadata?: { [key: string]: string | number | boolean | null | undefined }
} | null>>(keys.retrieve('test-key'))

// Test key update
expectType<Promise<{
  value: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  plan?: string
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>(keys.update('test-key', { enabled: false }))

// Test key deletion
expectType<Promise<boolean>>(keys.del('test-key'))

// Test keys list
expectType<Promise<Array<{
  value: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  plan?: string
  metadata?: { [key: string]: string | number | boolean | null | undefined }
}>>>(keys.list())

// Test Usage API
const { usage } = instance

// Test usage get
expectType<Promise<{
  limit: number
  remaining: number
  reset: number
  pending: Promise<any>
}>>(usage('test-key'))

// Test usage increment
expectType<Promise<{
  limit: number
  remaining: number
  reset: number
  pending: Promise<any>
}>>(usage.increment('test-key'))

expectType<Promise<{
  limit: number
  remaining: number
  reset: number
  pending: Promise<any>
}>>(usage.increment('test-key', { quantity: 5 }))

expectType<Promise<{
  limit: number
  remaining: number
  reset: number
  pending: Promise<any>
}>>(usage.increment('test-key', {
  quantity: 3,
  date: new Date(),
  throwError: true
}))

// Test Stats API
const { stats } = instance

// Test stats get
expectType<Promise<Array<{
  date: string
  count: number
}>>>(stats('test-key'))

// Test stats increment
expectType<Promise<number>>(stats.increment('test-key'))
expectType<Promise<number>>(stats.increment('test-key', 5))
expectType<Promise<number>>(stats.increment('test-key', 3, new Date()))

// Test utility function
expectType<string>(stats.formatYYYMMDDDate())
expectType<string>(stats.formatYYYMMDDDate(new Date()))

// Test uid utility
expectType<Promise<string>>(instance.uid({ redis, prefix: 'test:', size: 16 }))

// Test prefix functions
expectType<string>(plans.prefixKey('test'))
expectType<string>(keys.prefixKey('test'))
expectType<string>(usage.prefixKey('test'))
expectType<string>(stats.prefixKey('test'))
