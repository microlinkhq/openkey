'use strict'

const { getRandomValues } = require('crypto')

const BASE_58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const rand = size =>
  getRandomValues(new Uint8Array(size)).reduce((id, value) => id + BASE_58.charAt(value % BASE_58.length), '')

const uid = async ({ redis, prefix = '', size }) => {
  let uid
  do uid = `${prefix}${rand(size)}`
  while ((await redis.keys(`${prefix}*`)).includes(uid))
  return uid
}

const pick = (obj, keys) => {
  const result = {}
  for (const key of keys) if (obj[key] !== undefined) result[key] = obj[key]
  return result
}

/**
 * Assert a condition, or throw an error if the condition is falsy.
 * @param {*} value - The value to assert.
 * @param {string} message - The error message.
 */
const assert = (value, message) =>
  value ||
  (() => {
    throw new TypeError(message())
  })()

const assertMetadata = metadata => {
  if (metadata) {
    assert(isPlainObject(metadata), () => 'The metadata must be a flat object.')
    Object.keys(metadata).forEach(key => {
      assert(!isPlainObject(metadata[key]), () => `The metadata field '${key}' can't be an object.`)
      if (metadata[key] === undefined) delete metadata[key]
    })
    return Object.keys(metadata).length ? metadata : undefined
  }
}

const isPlainObject = value => {
  if (!value || typeof value !== 'object' || value.toString() !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

module.exports = {
  assert,
  assertMetadata,
  pick,
  uid
}
