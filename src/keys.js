import { pick, uid, validateKey } from './util.js'

export const KEY_PREFIX = 'key_'
const KEY_FIELDS = ['name', 'description', 'enabled', 'value']
const KEY_FIELDS_OBJECT = ['metadata']

export default ({ serialize, deserialize, redis } = {}) => {
  /**
   * Create a key.
   *
   * @param {Object} options - The options for creating a plan.
   * @param {string} options.name - The name of the key.
   * @param {string} [options.value] - The value of the key.
   * @param {string} [options.description] - The description of the key.
   * @param {string} [options.enabled] - Whether the key is enabled or not.
   * @param {Object} [options.metadata] - Any extra information can be attached here.
   *
   * @returns {Object} The created key.
   */
  const create = async (opts = {}) => {
    if (!opts.name) throw TypeError('The argument `name` is required.')

    const key = pick(opts, KEY_FIELDS.concat(KEY_FIELDS_OBJECT))
    key.id = await uid({ redis, prefix: KEY_PREFIX, size: 5 })
    key.createdAt = key.updatedAt = Date.now()
    key.value = await uid({ redis, size: 16 })
    if (key.enabled === undefined) key.enabled = true
    await redis.setnx(key.id, serialize(key))
    return key
  }

  /**
   * Retrieve a key by id.
   *
   * @param {string} keyId - The id of the key.
   *
   * @returns {Object} The key.
   */
  const retrieve = async (keyId, opts) =>
    deserialize(await redis.get(key(keyId, opts)))

  /**
   * Delete a key by id.
   *
   * @param {string} keyId - The id of the key.
   *
   * @returns {boolean} Whether the key was deleted or not.
   */
  const del = async (keyId, opts) => {
    const isDeleted = Boolean(await redis.del(key(keyId, opts)))
    if (!isDeleted) throw new TypeError(`The key \`${keyId}\` does not exist.`)
    return isDeleted
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
    const currentKey = await retrieve(keyId)
    if (!currentKey) throw new TypeError(`The key \`${keyId}\` does not exist.`)
    const metadata = Object.assign({}, currentKey.metadata, opts.metadata)
    const key = Object.assign(currentKey, pick(opts, KEY_FIELDS), { updatedAt: Date.now() })
    if (Object.keys(metadata).length) key.metadata = metadata
    await redis.set(keyId, serialize(key))
    return key
  }

  /**
   * List all keys.
   *
   * @returns {Array} The list of keys.
   */
  const list = async () => {
    const keyIds = await redis.keys(`${KEY_PREFIX}*`)
    return Promise.all(
      keyIds.map(keyIds => retrieve(keyIds, { verify: false }))
    )
  }

  const key = validateKey({ prefix: KEY_PREFIX })

  return {
    create,
    retrieve,
    del,
    update,
    list
  }
}
