'use strict'

import { pick, uid, validateKey } from './util.js'

export const PLAN_PREFIX = 'plan_'
const PLAN_QUOTA_PERIODS = ['day', 'week', 'month']
const PLAN_FIELDS = ['name', 'description']
const PLAN_FIELDS_OBJECT = ['quota', 'throttle', 'metadata']

export default ({ serialize, deserialize, redis } = {}) => {
  /**
   * Create a plan.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} options.name - The name of the plan.
   * @param {string} [options.description] - The description of the plan.
   * @param {number} [options.quota] - The quota of the plan.
   * @param {string} [options.quota.period] - The time period in which the limit applies. Valid values are "DAY", "WEEK" or "MONTH".
   * @param {number} [options.quota.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {Object} [options.throttle] - The throttle of the plan.
   * @param {number} [options.throttle.burstLimit] - The burst limit of the plan.
   * @param {number} [options.throttle.rateLimit] - The rate limit of the plan.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The created plan.
   */
  const create = async (opts = {}) => {
    if (!opts.name) throw TypeError('The argument `name` is required.')
    if (!PLAN_QUOTA_PERIODS.includes(opts.quota?.period)) {
      throw TypeError(
        `The argument \`quota.period\` must be ${PLAN_QUOTA_PERIODS.map(
          period => `\`${period}\``
        ).join(' or ')}.`
      )
    }
    if (!opts.quota?.limit) {
      throw TypeError('The argument `quota.limit` must be a positive number.')
    }
    const plan = pick(opts, PLAN_FIELDS.concat(PLAN_FIELDS_OBJECT))
    plan.id = await uid({ redis, prefix: PLAN_PREFIX, size: 5 })
    plan.createdAt = plan.updatedAt = Date.now()
    await redis.setnx(plan.id, serialize(plan))
    return plan
  }

  /**
   * Retrieve a plan by id
   *
   * @param {string} planId - The id of the plan.
   * @param {Object} [options] - The options for retrieving a plan.
   * @param {boolean} [options.validate=true] - Validate if the plan id is valid.
   * @param {boolean} [options.throwError=false] - Throw an error if the plan does not exist.
   *
   * @returns {Object} The plan.
   */
  const retrieve = async (
    planId,
    { throwError = false, validate = true } = {}
  ) => {
    const plan = await redis.get(getKey(planId, { validate }))
    if (plan === null && throwError) { throw new TypeError(`The plan \`${planId}\` does not exist.`) }
    return deserialize(plan)
  }

  /**
   * Delete a plan by id.
   *
   * @param {string} planId - The id of the plan.
   * @param {Object} [options] - The options for deleting a plan.
   *
   * @returns {boolean} Whether the plan was deleted or not.
   */
  const del = async planId => {
    const isDeleted = Boolean(await redis.del(getKey(planId, { validate: true })))
    if (!isDeleted) throw new TypeError(`The plan \`${planId}\` does not exist.`)
    return isDeleted
  }

  /**
   * Update a plan by id.
   *
   * @param {string} planId - The id of the plan.
   * @param {Object} options - The options for updating a plan.
   * @param {string} [options.name] - The name of the plan.
   * @param {string} [options.description] - The description of the plan.
   * @param {number} [options.quota] - The quota of the plan.
   * @param {string} [options.quota.period] - The time period in which the limit applies. Valid values are "DAY", "WEEK" or "MONTH".
   * @param {number} [options.quota.limit] - The target maximum number of requests that can be made in a given time period.
   * @param {Object} [options.throttle] - The throttle of the plan.
   * @param {number} [options.throttle.burstLimit] - The burst limit of the plan.
   * @param {number} [options.throttle.rateLimit] - The rate limit of the plan.
   * @param {object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The updated plan.
   */
  const update = async (planId, opts) => {
    const currentPlan = await retrieve(planId, { throwError: true })
    const quota = Object.assign(currentPlan.quota, opts.quota)
    const metadata = Object.assign({}, currentPlan.metadata, opts.metadata)
    const plan = Object.assign(currentPlan, pick(opts, PLAN_FIELDS), {
      quota,
      updatedAt: Date.now()
    })
    if (Object.keys(metadata).length) plan.metadata = metadata
    await redis.set(planId, serialize(plan))
    return plan
  }

  /**
   * List all plans.
   *
   * @returns {Array} The list of plans.
   */
  const list = async () => {
    const planIds = await redis.keys(`${PLAN_PREFIX}*`)
    return Promise.all(
      planIds.map(planId => retrieve(planId, { validate: false }))
    )
  }

  const getKey = validateKey({ prefix: PLAN_PREFIX })

  return {
    create,
    del,
    retrieve,
    update,
    list
  }
}
