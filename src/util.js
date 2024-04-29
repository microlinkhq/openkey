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

const formatYYYMMDDDate = (now = new Date()) => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
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
  uid
}
