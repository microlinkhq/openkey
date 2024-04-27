'use strict'

const { pick, assert, assertMetadata } = require('./util')

module.exports = ({ serialize, deserialize, redis, keys, prefix } = {}) => {
  /**
   * Create a plan.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} options.id - The id of the plan.
   * @param {number} [options.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {string} [options.period] - The time period in which the limit applies. Valid values are "DAY", "WEEK" or "MONTH".
   * @param {number} [options.burst] - The burst limit of the plan.
   * @param {number} [options.rate] - The rate limit of the plan.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The plan object.
   */
  const create = async (opts = {}) => {
    assert(typeof opts.id === 'string' && opts.id.length > 0, () => 'The argument `id` must be a string.')
    assert(!/\s/.test(opts.id), () => 'The argument `id` cannot contain whitespace.')
    const plan = Object.assign(
      {
        limit: assert(
          typeof opts.limit === 'number' && opts.limit > 0 && opts.limit,
          () => 'The argument `limit` must be a positive number.'
        ),
        period: assert(
          typeof opts.period === 'string' && opts.period.length > 0 && opts.period,
          () => 'The argument `period` must be a string.'
        )
      },
      pick(opts, ['rate', 'burst'])
    )
    const metadata = assertMetadata(opts.metadata)
    if (metadata) plan.metadata = metadata
    plan.createdAt = plan.updatedAt = Date.now()
    const isCreated = (await redis.set(prefixKey(opts.id), serialize(plan), 'NX')) === 'OK'
    if (!isCreated) throw new TypeError(`The plan \`${opts.id}\` already exists.`)
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
    if (throwError) assert(plan !== null, () => `The plan \`${id}\` does not exist.`)
    else if (plan === null) return null
    return Object.assign({ id }, deserialize(plan))
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
    assert(key === undefined, () => `The plan \`${id}\` is associated with the key \`${key.value}\`.`)
    const isDeleted = (await redis.del(prefixKey(id))) === 1
    assert(isDeleted, () => `The plan \`${id}\` does not exist.`)
    return isDeleted
  }

  /**
   * Update a plan by id.
   *
   * @param {string} id - The id of the plan.
   * @param {Object} options - The options for updating a plan.
   * @param {number} [options.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {string} [options.period] - The time period in which the limit applies. Valid values are "DAY", "WEEK" or "MONTH".
   * @param {number} [options.burst] - The burst limit of the plan.
   * @param {number} [options.rate] - The rate limit of the plan.
   * @param {object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The updated plan.
   */
  const update = async (id, opts) => {
    const currentPlan = await retrieve(id, { throwError: true })
    const metadata = Object.assign({}, currentPlan.metadata, assertMetadata(opts.metadata))

    const plan = Object.assign(
      currentPlan,
      {
        updatedAt: Date.now()
      },
      pick(opts, ['rate', 'burst'])
    )

    if (opts.limit) {
      plan.limit = assert(
        typeof opts.limit === 'number' && opts.limit > 0 && opts.limit,
        () => 'The argument `limit` must be a positive number.'
      )
    }

    if (opts.period) {
      plan.period = assert(
        typeof opts.period === 'string' && opts.period.length > 0 && opts.period,
        () => 'The argument `period` must be a string.'
      )
    }

    if (Object.keys(metadata).length) plan.metadata = metadata
    return (await redis.set(prefixKey(id), serialize(plan))) && plan
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

  const prefixKey = key => `${prefix}plan_${key}`

  return { create, del, retrieve, update, list, prefixKey }
}
