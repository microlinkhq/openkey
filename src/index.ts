import * as IORedis from 'ioredis'
import Keys from './structures/Keys'

import type { Key } from './structures/Keys'
import Plans from './structures/Plans'

interface Gateway {
  db: IORedis.Redis
  plans: Plans
  keys: Keys
}

interface Result {
  used: number
  remain: number
  limit: number
}

const toNumber = (value: string): number => parseInt(value, 10)
class Gateway {
  constructor (db: IORedis.Redis) {
    this.db = db
    this.plans = new Plans(db)
    this.keys = new Keys(this.db, this.plans)
  }

  async usage (key: string): Promise<Result | false> {
    const hashKey = `keys:${key}`
    const day = new Date()
    const field = `count:${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`
    const operations = [
      ['exists', hashKey],
      ['hget', hashKey, 'limit'],
      ['hincrby', hashKey, field, '1'],
      ['hgetall', hashKey]
    ]
    const result = await this.db.multi(operations).exec()

    const exists = result[0][1] === 1
    if (!exists) return false

    const limit = toNumber(result[1][1])
    if (Number.isNaN(limit)) return false

    const counts = Object.fromEntries(Object.entries(result[3][1])
      .map(([key, value]) =>
        key.includes('count:') ? [key, toNumber(value as string)] : false)
      .filter(Boolean) as Array<[string, number]>)

    const used = Object.values(counts).reduce((a, b) => a + b, 0)
    const remain = limit - used

    return {
      used, remain, limit
    }
  }
}

export default Gateway
export type { Key }
