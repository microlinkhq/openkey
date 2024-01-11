import { getRandomValues } from 'crypto'

const BASE_58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const rand = (size) =>
  getRandomValues(new Uint8Array(size)).reduce(
    (id, value) => id + BASE_58.charAt(value % BASE_58.length),
    ''
  )

export const uid = async ({ redis, prefix = '', size }) => {
  let uid
  do uid = `${prefix}${rand(size)}`
  while ((await redis.keys(`${prefix}*`)).includes(uid))
  return uid
}

export const pick = (obj, keys) => {
  const result = {}
  for (const key of keys) if (obj[key] !== undefined) result[key] = obj[key]
  return result
}

export const validateKey = ({ prefix }) => (id, { verify = true } = {}) => {
  if (!verify) return id
  if (!id.startsWith(prefix)) throw new Error(`The id \`${id}\` must to start with \`${prefix}\`.`)
  return id
}
