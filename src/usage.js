'use strict'

const ms = require('ms')

module.exports = ({ plans, keys, redis, stats, prefix, serialize, deserialize }) => {
  const prefixKey = key => `${prefix}usage:${key}`

  /**
   * Increment the usage for a given key.
   *
   * @param {string} keyValue
   * @param {number} [quantity=1]
   *
   * @returns {Promise<{limit: number, remaining: number, reset: number, pending: Promise<void>}>}
   *
   * @example
   * const usage = await openkey.usage('key-value')
   * // usage = {
   * //   limit: 1000,
   * //   remaining: 999,
   * //   reset: 1612137600000,
   * //   pending: Promise<void>
   * // }
   *
   */
  const increment = async (keyValue, quantity = 1) => {
    const key = await keys.retrieve(keyValue)
    const plan = await plans.retrieve(key.plan)

    let usage = deserialize(await redis.get(prefixKey(keyValue)))

    // TODO: move into lua script
    if (usage === null) {
      usage = {
        count: quantity,
        reset: Date.now() + ms(plan.period)
      }
    } else if (Date.now() > usage.reset) {
      usage.count = quantity
      usage.reset = Date.now() + ms(plan.period)
    } else {
      if (usage.count < plan.limit) {
        usage.count = usage.count + quantity
      }
    }

    const pending =
      quantity > 0 && Promise.all([redis.set(prefixKey(keyValue), serialize(usage)), stats.increment(keyValue)])

    return {
      limit: plan.limit,
      remaining: plan.limit - usage.count,
      reset: usage.reset,
      pending
    }
  }

  /**
   * Get usage for a given key.
   *
   * @param {string} keyValue
   *
   * @returns {Promise<{limit: number, remaining: number, reset: number, pending: Promise<void}>}
   *
   * @example
   * const usage = await openkey.usage('key-value')
   * // usage = {
   * //   limit: 1000,
   * //   remaining: 999,
   * //   reset: 1612137600000,
   * //   pending: Promise<void>
   * // }
   *
   */
  const get = async keyValue => increment(keyValue, 0)
  get.increment = increment
  get.prefixKey = prefixKey

  return get
}
