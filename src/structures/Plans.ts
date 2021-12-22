import IORedis from 'ioredis'

interface Plan {
  id: string
  name: string
  limit: number
  ttl: number
}

class Plans {
  readonly cache = new Map()
  constructor (readonly db: IORedis.Redis) {
    this.db = db
  }

  async create (plan: Plan): Promise<boolean> {
    const success = await this.db.setnx(`plans:${plan.id}`, JSON.stringify(plan)) === 1
    success && this.cache.set(plan.id, plan)
    return success
  }

  async retrieve (id: string): Promise<Plan | false> {
    const cache = this.cache.get(id)
    if (cache !== undefined) return cache
    const data = await this.db.get(`plans:${id}`)
    if (data === null) return false
    return JSON.parse(data)
  }

  async update (plan: Plan): Promise<boolean> {
    const success = await this.db.set(`plans:${plan.id}`, 'data', JSON.stringify(plan)) === 'OK' // TODO: change set mode to XX ( set only if exists )
    success && this.cache.set(plan.id, plan)
    return success
  }

  async delete (id: string): Promise<boolean> {
    const success = await this.db.del(`plans:${id}`) === 1
    success && this.cache.delete(id)
    return success
  }

  async list (): Promise<Plan[]> {
    const plans = await this.db.keys('plans:*')
    const plansData = await Promise.all(plans.map(async plan => await this.db.get(plan)))
    return plansData.map(planData => planData !== null ? JSON.parse(planData) : false).filter(Boolean)
  }

  async addKey (id: string, key: string): Promise<boolean> {
    const lKey = `plan:${id}:keys`
    const success = await this.db.lpush(lKey, key) > 0
    return success
  }

  async listKeys (id: string): Promise<string[]> {
    const lKey = `plan:${id}:keys`
    const keys = await this.db.lrange(lKey, 0, -1)
    return keys
  }

  async moveKey (id1: string, id2: string, key: string): Promise<boolean> {
    const lKey1 = `plan:${id1}:keys`
    const lKey2 = `plan:${id2}:keys`
    const result = await this.db.multi()
      .lrem(lKey1, 0, key)
      .lpush(lKey2, key)
      .exec()
    console.log('moveKey', { result })
    const success = result[0][1] > 0 && result[1][1] > 0
    return success
  }

  async deleteKey (planId: string, key: string): Promise<boolean> {
    const lKey = `plan:${planId}:keys`
    const success = await this.db.lrem(lKey, 0, key) > 0
    return success
  }
}

export default Plans
export type { Plan }
