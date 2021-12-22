import IORedis from 'ioredis'
import Plans, { Plan } from './Plans'

interface Key {
  planId: string
  id: string
  key: string
  name: string
}

const keys: [string, string, string, string] = ['planId', 'id', 'key', 'name']
type HashEntry = [string, string, string, string, string, string, string, string]

function isKey (obj: any): obj is Key {
  const targetKeys = Object.keys(obj)
  return keys.every(key => targetKeys.includes(key)) && targetKeys.length === keys.length
}

function toHash (obj: any, plan: Plan): HashEntry | false {
  if (!isKey(obj)) return false
  return ([] as string[])
    .concat(...Object.entries(obj))
    .concat(['limit', String(plan.limit), 'ttl', String(plan.ttl)]) as unknown as HashEntry
}

class Keys {
  constructor (readonly db: IORedis.Redis, readonly plans: Plans) {
    this.db = db
    this.plans = plans
  }

  async create (key: Key): Promise<boolean> {
    const plan = await this.plans.retrieve(key.planId)
    if (plan === false) return false
    const entries = toHash(key, plan)
    if (entries === false) return false
    let success = await this.db.hset(`keys:${key.key}`, ...entries) === 1
    if (success) success = success && await this.plans.addKey(key.planId, key.key)
    return success
  }

  async retrieve (key: string): Promise<Key | false> {
    // @ts-expect-error
    const data = await (this.db.hget(`keys:${key}`, ...keys) as Promise) // TODO: TS definitions for IORedis don't allow arbitrary number of arguments
    if (data === null) return false
    return data
  }

  async update (key: Key): Promise<boolean> {
    const plan = await this.plans.retrieve(key.planId)
    if (plan === false) return false
    const entries = toHash(key, plan)
    if (entries === false) return false

    const result = await this.db.multi()
      .hget(`keys:${key.key}`, 'planId')
      .hset(`keys:${key.key}`, ...entries) // TODO: TS definitions for IORedis don't allow arbitrary number of arguments
      .exec()
    const initialPlanId = result[0][1]
    let success = result[1][1] > 0
    if (initialPlanId !== key.planId) success = success && await this.plans.moveKey(initialPlanId, key.planId, key.key) // Move key to new plan, if plan has changed
    return success
  }

  async delete (key: string): Promise<boolean> {
    const result = await this.db.multi()
      .hget(`keys:${key}`, 'planId')
      .del(`keys:${key}`)
      .exec()
    const planId = result[0][1]
    let success = result[1][1] === 1
    if (planId !== null) success = success && await this.plans.deleteKey(planId, key)
    return success
  }

  async list (): Promise<Key[]> {
    const allKeys = await this.db.keys('keys:*')
    // @ts-expect-error
    const keysData = await Promise.all(allKeys.map(async key => await this.db.hget(`keys:${key}`, ...keys)))
    return keysData.map(keyData => keyData !== null ? keyData : false).filter(Boolean) as unknown as Key[]
  }
}

export default Keys
export type { Key }
