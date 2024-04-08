'use strict'

const { pick, uid, validateKey, assert, assertMetadata } = require('./util')

const PLAN_PREFIX = 'plan_'
const PLAN_QUOTA_PERIODS = ['day', 'week', 'month']
const PLAN_FIELDS = ['name', 'description']
const PLAN_FIELDS_OBJECT = ['quota', 'throttle', 'metadata']

module.exports = ({ serialize, deserialize, redis } = {}) => {
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
   * @returns {Object} The plan object.
   */
  const create = async (opts = {}) => {
    assert(typeof opts.name === 'string' && opts.name.length > 0, 'The argument `name` is required.')
    assert(
      PLAN_QUOTA_PERIODS.includes(opts.quota?.period),
      `The argument \`quota.period\` must be ${PLAN_QUOTA_PERIODS.map(period => `\`${period}\``).join(' or ')}.`
    )
    assert(opts.quota.limit > 0, 'The argument `quota.limit` must be a positive number.')
    opts.metadata = assertMetadata(opts.metadata)
    const plan = pick(opts, PLAN_FIELDS.concat(PLAN_FIELDS_OBJECT))
    plan.id = await uid({ redis, prefix: PLAN_PREFIX, size: 5 })
    plan.createdAt = plan.updatedAt = Date.now()
    return (await redis.setnx(plan.id, serialize(plan))) && plan
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
  const retrieve = async (planId, { throwError = false, validate = true } = {}) => {
    const plan = await redis.get(getKey(planId, { validate }))
    if (throwError) {
      assert(plan !== null, `The plan \`${planId}\` does not exist.`)
    }
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
    const isDeleted = (await redis.del(getKey(planId, { validate: true }))) === 1
    assert(isDeleted, `The plan \`${planId}\` does not exist.`)
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
    const metadata = Object.assign({}, currentPlan.metadata, assertMetadata(opts.metadata))
    const plan = Object.assign(currentPlan, pick(opts, PLAN_FIELDS), {
      quota,
      updatedAt: Date.now()
    })
    if (Object.keys(metadata).length) plan.metadata = metadata
    return (await redis.set(planId, serialize(plan))) && plan
  }

  /**
   * List all plans.
   *
   * @returns {Array} The list of plans.
   */
  const list = async () => {
    const planIds = await redis.keys(`${PLAN_PREFIX}*`)
    return Promise.all(planIds.map(planId => retrieve(planId, { validate: false })))
  }

  const getKey = validateKey({ prefix: PLAN_PREFIX })

  return { create, del, retrieve, update, list }
}

module.exports.PLAN_PREFIX = PLAN_PREFIX
