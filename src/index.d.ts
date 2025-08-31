/**
 * TypeScript definitions for openkey
 * Fast authentication layer for your SaaS, backed by Redis.
 */

// Redis interface - can be any Redis client with these methods
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: any[]): Promise<any>
  del(key: string): Promise<number>
  keys(pattern: string): Promise<string[]>
  mget(...keys: string[]): Promise<(string | null)[]>
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any>
  scanStream(options: { match: string }): any
}

// Serialization functions
interface SerializationOptions {
  serialize?: (data: any) => string | Promise<string>
  deserialize?: (data: string) => any | Promise<any>
}

// Main openkey configuration options
interface OpenKeyOptions extends SerializationOptions {
  redis?: RedisClient
  prefix?: string
}

// Metadata is a flat object with string/number/boolean values
interface Metadata {
  [key: string]: string | number | boolean | null | undefined
}

// Base entity with timestamps
interface BaseEntity {
  createdAt: number
  updatedAt: number
  metadata?: Metadata
}

// Plan interface
interface Plan extends BaseEntity {
  id: string
  limit: number
  period: string
}

interface CreatePlanOptions {
  id: string
  limit: number
  period: string
  metadata?: Metadata
}

interface UpdatePlanOptions {
  limit?: number
  period?: string
  metadata?: Metadata | null
}

// Key interface
interface Key extends BaseEntity {
  value: string
  enabled: boolean
  plan?: string
}

interface CreateKeyOptions {
  value?: string
  enabled?: boolean
  plan?: string
  metadata?: Metadata
}

interface UpdateKeyOptions {
  value?: string
  enabled?: boolean
  plan?: string
  metadata?: Metadata | null
}

interface RetrieveOptions {
  throwError?: boolean
}

// Usage interface
interface Usage {
  limit: number
  remaining: number
  reset: number
  pending: Promise<any>
}

interface IncrementOptions {
  date?: Date
  quantity?: number
  throwError?: boolean
}

// Stats interface
interface StatEntry {
  date: string
  count: number
}

// Error codes
type ErrorCode =
  | 'ERR_KEY_NOT_EXIST'
  | 'ERR_KEY_IS_ASSOCIATED'
  | 'ERR_PLAN_NOT_EXIST'
  | 'ERR_PLAN_ID_REQUIRED'
  | 'ERR_PLAN_INVALID_ID'
  | 'ERR_PLAN_INVALID_LIMIT'
  | 'ERR_PLAN_INVALID_PERIOD'
  | 'ERR_PLAN_ALREADY_EXIST'
  | 'ERR_METADATA_NOT_FLAT_OBJECT'
  | 'ERR_METADATA_INVALID'

declare class OpenKeyError extends Error {
  name: 'OpenKeyError'
  code: ErrorCode
  constructor(props: { code: ErrorCode; message: string })
}

// Plans module interface
interface PlansModule {
  create(options: CreatePlanOptions): Promise<Plan>
  retrieve(id: string, options?: RetrieveOptions): Promise<Plan | null>
  update(id: string, options: UpdatePlanOptions): Promise<Plan>
  del(id: string): Promise<boolean>
  list(): Promise<Plan[]>
  prefixKey(key: string): string
}

// Keys module interface
interface KeysModule {
  create(options?: CreateKeyOptions): Promise<Key>
  retrieve(value: string, options?: RetrieveOptions): Promise<Key | null>
  update(value: string, options: UpdateKeyOptions): Promise<Key>
  del(value: string): Promise<boolean>
  list(): Promise<Key[]>
  prefixKey(key: string): string
}

// Usage module interface
interface UsageModule {
  (keyValue: string): Promise<Usage>
  increment(keyValue: string, options?: IncrementOptions): Promise<Usage>
  prefixKey(key: string): string
}

// Stats module interface
interface StatsModule {
  (keyValue: string): Promise<StatEntry[]>
  increment(keyValue: string, quantity?: number, date?: Date): Promise<number>
  prefixKey(key: string): string
  formatYYYMMDDDate(date?: Date): string
}

// Main OpenKey instance
interface OpenKey {
  keys: KeysModule
  plans: PlansModule
  usage: UsageModule
  stats: StatsModule
  uid(options: { redis: RedisClient; prefix?: string; size?: number }): Promise<string>
}

// Main factory function
declare function openkey(options?: OpenKeyOptions): OpenKey

export = openkey
