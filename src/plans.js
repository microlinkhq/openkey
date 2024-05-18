'use strict'

const assert = require('./assert')
const metadata = require('./metadata')

module.exports = ({ serialize, deserialize, redis, keys, prefix } = {}) => {
  /**
   * Create a plan.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} options.id - The id of the plan.
   * @param {number} [options.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {string} [options.period] - The time period in which the limit applies.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The plan object.
   */
  const create = async (opts = {}) => {
    assert(typeof opts.id === 'string' && opts.id.length > 0, 'ERR_PLAN_ID_REQUIRED')
    assert(!/\s/.test(opts.id), 'ERR_PLAN_INVALID_ID')
    const plan = {
      limit: assert(typeof opts.limit === 'number' && opts.limit > 0 && opts.limit, 'ERR_PLAN_INVALID_LIMIT'),
      period: assert(
        typeof opts.period === 'string' && opts.period.length > 0 && opts.period,
        'ERR_PLAN_INVALID_PERIOD'
      )
    }
    metadata(plan, opts)
    plan.createdAt = plan.updatedAt = Date.now()
    const isCreated = (await redis.set(prefixKey(opts.id), await serialize(plan), 'NX')) === 'OK'
    assert(isCreated, 'ERR_PLAN_ALREADY_EXIST', () => [opts.id])
    return Object.assign({ id: opts.id }, plan)
  }

  /**
   * Retrieve a plan by id.
   *
   * @param {string} id - The id of the plan.
   * @param {Object} [options] - The options for retrieving a plan.
   * @param {boolean} [options.validate=true] - Validate if the plan id is valid.
   * @param {boolean} [options.throwError=false] - Throw an error if the plan does not exist.
   *
   * @returns {Object} The plan.
   */
  const retrieve = async (id, { throwError = false } = {}) => {
    const plan = await redis.get(prefixKey(id))
    if (throwError) assert(plan !== null, 'ERR_PLAN_NOT_EXIST', () => [id])
    else if (plan === null) return null
    return Object.assign({ id }, await deserialize(plan))
  }

  /**
   * Delete a plan by id.
   *
   * @param {string} id - The id of the plan.
   * @param {Object} [options] - The options for deleting a plan.
   *
   * @returns {boolean} Whether the plan was deleted or not.
   */
  const del = async id => {
    const allKeys = await keys().list()
    const key = allKeys.find(key => key.plan === id)
    assert(key === undefined, 'ERR_KEY_IS_ASSOCIATED', () => [id, key.value])
    const isDeleted = (await redis.del(prefixKey(id))) === 1
    assert(isDeleted, 'ERR_PLAN_NOT_EXIST', () => [id])
    return isDeleted
  }

  /**
   * Update a plan by id.
   *
   * @param {string} id - The id of the plan.
   * @param {Object} options - The options for updating a plan.
   * @param {number} [options.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {string} [options.period] - The time period in which the limit applies. Valid values are "DAY", "WEEK" or "MONTH".
   * @param {object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The updated plan.
   */
  const update = async (id, opts) => {
    let plan = await retrieve(id, { throwError: true })

    if (opts.limit) {
      plan.limit = assert(typeof opts.limit === 'number' && opts.limit > 0 && opts.limit, 'ERR_PLAN_INVALID_LIMIT')
    }

    if (opts.period) {
      plan.period = assert(
        typeof opts.period === 'string' && opts.period.length > 0 && opts.period,
        'ERR_PLAN_INVALID_PERIOD'
      )
    }

    plan = Object.assign(metadata(plan, opts), { updatedAt: Date.now() })

    return (await redis.set(prefixKey(id), await serialize(plan))) && plan
  }

  /**
   * List all plans.
   *
   * @returns {Array} The list of plans.
   */
  const list = async () => {
    const allPlans = await redis.keys(prefixKey('*'))
    const planIds = allPlans.map(key => key.replace(prefixKey(''), ''))
    const result = await Promise.all(planIds.map(planId => retrieve(planId)))
    return result
  }

  const prefixKey = key => `${prefix}plan:${key}`

  return { create, del, retrieve, update, list, prefixKey }
}
