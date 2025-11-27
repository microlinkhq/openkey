'use strict'

const { getRandomValues } = require('crypto')

/// Bitcoin Base58 (no 0, O, I, l)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const ALPHA_LEN = ALPHABET.length // 58

// 2^6 - 1 = 63 → smallest mask >= 58
const MASK = 63

// nanoid rule: optimal randomness batch size
const STEP_FACTOR = 1.6

const rand = (size = 22) => {
  let id = ''
  const step = Math.ceil((STEP_FACTOR * MASK * size) / ALPHA_LEN)

  while (id.length < size) {
    const bytes = getRandomValues(new Uint8Array(step))
    for (const byte of bytes) {
      const index = byte & MASK
      if (index < ALPHA_LEN) {
        id += ALPHABET[index]
        if (id.length === size) break
      }
    }
  }

  return id
}

const uid = async ({ redis, prefix = '', size = 16 }) => {
  let uid
  do uid = `${prefix}${rand(size)}`
  while ((await redis.get(uid)) !== null)
  return uid.replace(prefix, '')
}

const pick = (obj, keys) => {
  const result = {}
  for (const key of keys) if (obj[key] !== undefined) result[key] = obj[key]
  return result
}

const formatYYYMMDDDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isPlainObject = value => {
  if (!value || typeof value !== 'object' || value.toString() !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

module.exports = {
  formatYYYMMDDDate,
  isPlainObject,
  pick,
  rand,
  uid
}
