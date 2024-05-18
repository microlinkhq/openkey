'use strict'

const { pick, uid } = require('./util')
const metadata = require('./metadata')
const assert = require('./assert')

module.exports = ({ serialize, deserialize, plans, redis, prefix } = {}) => {
  /**
   * Create a key.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} [options.value] - The value of the key.
   * @param {string} [options.plan] - The id of the plan associated.
   * @param {string} [options.enabled] - Whether the key is enabled or not.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The created key.
   */
  const create = async (opts = {}) => {
    const key = { enabled: opts.enabled ?? true }
    if (metadata) key.metadata = metadata
    metadata(key, opts)
    key.createdAt = key.updatedAt = Date.now()
    const value = opts.value ?? (await uid({ redis, size: 16 }))
    if (opts.plan) {
      await plans.retrieve(opts.plan, { throwError: true })
      key.plan = opts.plan
    }
    await redis.set(prefixKey(value), await serialize(key), 'NX')
    return Object.assign({ value }, key)
  }

  /**
   * Retrieve a key by value.
   *
   * @param {string} value - The value of the key.
   * @param {Object} [options] - The options for retrieving a key.
   * @param {boolean} [options.validate=true] - Validate if the plan id is valid.
   * @param {boolean} [options.throwError=false] - Throw an error if the plan does not exist.
   *
   * @returns {Object|null} The key object, null if it doesn't exist.
   */
  const retrieve = async (value, { throwError = false } = {}) => {
    const key = await redis.get(prefixKey(value))
    if (throwError) assert(key !== null, 'ERR_KEY_NOT_EXIST', () => [value])
    else if (key === null) return null
    return Object.assign({ value }, await deserialize(key))
  }

  /**
   * Delete a key by value.
   *
   * @param {string} value - The value of the key.
   *
   * @returns {boolean} Whether the key was deleted or not.
   */
  const del = async value => {
    const isDeleted = (await redis.del(prefixKey(value))) === 1
    assert(isDeleted, 'ERR_KEY_NOT_EXIST', () => [value])
    return isDeleted
  }

  /**
   * Update a key by value.
   *
   * @param {string} value - The value of the plan.
   * @param {Object} options - The options for updating a plan.
   * @param {string} [options.value] - The value of the key.
   * @param {object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The updated plan.
   */
  const update = async (value, opts) => {
    let key = await retrieve(value, { throwError: true })
    key = Object.assign(metadata(key, opts), { updatedAt: Date.now() }, pick(opts, ['enabled', 'value', 'plan']))
    if (key.plan) await plans.retrieve(key.plan, { throwError: true })
    return (await redis.set(prefixKey(value), await serialize(key))) && key
  }

  /**
   * List all keys.
   *
   * @returns {Array} The list of keys.
   */
  const list = async () => {
    const allKeys = await redis.keys(prefixKey('*'))
    const keyValues = allKeys.map(key => key.replace(prefixKey(''), ''))
    return Promise.all(keyValues.map(keyValues => retrieve(keyValues)))
  }

  const prefixKey = key => `${prefix}key:${key}`

  return { create, retrieve, del, update, list, prefixKey }
}
