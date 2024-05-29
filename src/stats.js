'use strict'

const { promisify } = require('util')
const stream = require('stream')

const { formatYYYMMDDDate } = require('./util')

const { Transform } = stream
const pipeline = promisify(stream.pipeline)

/**
 * 90 days in milliseconds
 */
const TTL = 90 * 24 * 60 * 60 * 1000

/**
 * Lua script to increment a key and set an expiration time if it doesn't have one.
 * This script is necessary to perform the operation atomically.
 */
const LUA_INCREMENT_AND_EXPIRE = `
local key = KEYS[1]
local ttl = ARGV[1]
local quantity = ARGV[2]
local current = redis.call('incrby', key, quantity)
if tonumber(redis.call('ttl', key)) == -1 then
  redis.call('expire', key, ttl)
end
return current
`

module.exports = ({ redis, prefix }) => {
  const prefixKey = key => `${prefix}stats:${key}`

  const increment = (keyValue, quantity = 1, date = new Date()) =>
    redis.eval(LUA_INCREMENT_AND_EXPIRE, 1, `${prefixKey(keyValue)}:${formatYYYMMDDDate(date)}`, TTL, quantity)

  /**
   * Get stats for a given key.
   *
   * @param {string} keyValue
   *
   * @returns {Promise<Array<{date: string, count: number}>}
   *
   * @example
   * const stats = await openkey.stats('key-value')
   * // stats = [
   * //   { date: '2021-01-01', count: 1 },
   * //   { date: '2021-01-02', count: 10 },
   * //   { date: '2021-01-03', count: 5 }
   * // ]
   */
  const stats = async keyValue => {
    const stats = []
    const stream = redis.scanStream({ match: `${prefixKey(keyValue)}*` })
    const dataHandler = new Transform({
      objectMode: true,
      transform: async (keys, _, next) => {
        if (keys.length) {
          const values = await redis.mget.apply(redis, keys)
          const statsPart = keys.map((key, i) => ({
            date: key.replace(`${prefixKey(keyValue)}:`, ''),
            count: Number(values[i])
          }))
          stats.push.apply(stats, statsPart)
        }
        next()
      }
    })

    await pipeline(stream, dataHandler)
    return stats.sort((a, b) => a.date.localeCompare(b.date))
  }

  stats.increment = increment
  stats.prefixKey = prefixKey
  stats.formatYYYMMDDDate = formatYYYMMDDDate

  return stats
}
