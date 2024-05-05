'use strict'

const ms = require('ms')

module.exports = ({ plans, keys, redis, stats, prefix, serialize, deserialize }) => {
  const prefixKey = key => `${prefix}usage:${key}`

  /**
   * Increment the usage for a given key.
   *
   * @param {string} keyValue
   * @param {Object} options - The options for creating a plan.
   * @param {number} [options.quantity=1] - The quantity to increment.
   * @param {boolean} [options.throwError=true] - Throw an error if the key does not exist.
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
  const increment = async (keyValue, { quantity = 1, throwError = true } = {}) => {
    const key = await keys.retrieve(keyValue, { throwError })
    const plan = await plans.retrieve(key.plan, { throwError })

    let usage = await deserialize(await redis.get(prefixKey(keyValue)))
    const now = Date.now()

    if (usage === null) {
      usage = {
        count: Math.min(quantity, plan.limit),
        reset: now + ms(plan.period)
      }
    } else if (now > usage.reset) {
      usage.count = quantity
      usage.reset = now + ms(plan.period)
    } else {
      if (usage.count < plan.limit) {
        usage.count = Math.min(usage.count + quantity, plan.limit)
      }
    }

    const pending =
      quantity > 0
        ? Promise.all([redis.set(prefixKey(keyValue), await serialize(usage)), stats.increment(keyValue, quantity)])
        : Promise.resolve([])

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
  const get = async keyValue => increment(keyValue, { quantity: 0 })
  get.increment = increment
  get.prefixKey = prefixKey

  return get
}
