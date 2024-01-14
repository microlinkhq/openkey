import { pick, uid, validateKey, assert } from './util.js'

export const KEY_PREFIX = 'key_'
const KEY_FIELDS = ['name', 'description', 'enabled', 'value', 'plan']
const KEY_FIELDS_OBJECT = ['metadata']

export default ({ serialize, deserialize, plans, redis } = {}) => {
  /**
   * Create a key.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} options.name - The name of the key.
   * @param {string} [options.value] - The value of the key.
   * @param {string} [options.plan] - The id of the plan associated.
   * @param {string} [options.description] - The description of the key.
   * @param {string} [options.enabled] - Whether the key is enabled or not.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The created key.
   */
  const create = async (opts = {}) => {
    assert(typeof opts.name === 'string' && opts.name.length > 0, 'The argument `name` is required.')
    const key = pick(opts, KEY_FIELDS.concat(KEY_FIELDS_OBJECT))
    key.id = await uid({ redis, prefix: KEY_PREFIX, size: 5 })
    key.createdAt = key.updatedAt = Date.now()
    key.value = await uid({ redis, size: 16 })
    if (key.enabled === undefined) key.enabled = true
    if (opts.plan) await plans.retrieve(opts.plan, { throwError: true })
    return (await redis.setnx(key.id, serialize(key))) && key
  }

  /**
   * Retrieve a key by id.
   *
   * @param {string} keyId - The id of the key.
   * @param {Object} [options] - The options for retrieving a key.
   * @param {boolean} [options.validate=true] - Validate if the plan id is valid.
   * @param {boolean} [options.throwError=false] - Throw an error if the plan does not exist.
   *
   * @returns {Object|null} The key object, null if it doesn't exist.
   */
  const retrieve = async (keyId, { throwError = false, validate = true } = {}) => {
    const key = await redis.get(getKey(keyId, { validate }))
    if (throwError) {
      assert(key !== null, `The key \`${keyId}\` does not exist.`)
    }
    return deserialize(key)
  }

  /**
   * Delete a key by id.
   *
   * @param {string} keyId - The id of the key.
   *
   * @returns {boolean} Whether the key was deleted or not.
   */
  const del = async keyId => {
    const key = await retrieve(keyId, { verify: true })
    if (key !== null && typeof key.plan === 'string') {
      const plan = await plans.retrieve(key.plan, {
        throwError: true,
        validate: false
      })
      assert(plan === null, `The key \`${keyId}\` is associated with the plan \`${getKey.plan}\``)
    }
    const isDeleted = (await redis.del(getKey(keyId, { verify: true }))) === 1
    return assert(isDeleted, `The key \`${keyId}\` does not exist.`) || isDeleted
  }

  /**
   * Update a key by id.
   *
   * @param {string} keyId - The id of the plan.
   * @param {Object} options - The options for updating a plan.
   * @param {string} [options.name] - The name of the key.
   * @param {string} [options.value] - The value of the key.
   * @param {string} [options.description] - The description of the key.
   * @param {string} [options.enabled] - Whether the key is enabled or not.
   * @param {object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The updated plan.
   */
  const update = async (keyId, opts) => {
    const currentKey = await retrieve(keyId, { throwError: true })
    const metadata = Object.assign({}, currentKey.metadata, opts.metadata)
    const key = Object.assign(currentKey, pick(opts, KEY_FIELDS), {
      updatedAt: Date.now()
    })
    if (Object.keys(metadata).length) key.metadata = metadata
    if (key.plan) await plans.retrieve(key.plan, { throwError: true })
    return (await redis.set(keyId, serialize(key))) && key
  }

  /**
   * List all keys.
   *
   * @returns {Array} The list of keys.
   */
  const list = async () => {
    const keyIds = await redis.keys(`${KEY_PREFIX}*`)
    return Promise.all(keyIds.map(keyIds => retrieve(keyIds, { validate: false })))
  }

  const getKey = validateKey({ prefix: KEY_PREFIX })

  return { create, retrieve, del, update, list }
}
