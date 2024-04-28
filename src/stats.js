'use strict'

const formatYYYMMDDDate = (now = new Date()) => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = ({ redis, prefix }) => {
  const prefixKey = key => `${prefix}stats:${key}`

  const increment = async keyValue => {
    redis.incr(`${prefixKey(keyValue)}:${formatYYYMMDDDate()}`)
  }

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
    const keys = await redis.keys(prefixKey(`${keyValue}*`))
    const stats = []

    for (const key of keys) {
      const date = key.replace(`${prefixKey(keyValue)}:`, '')
      const count = Number(await redis.get(key))
      stats.push({ date, count })
    }

    return stats.sort((a, b) => a.date.localeCompare(b.date))
  }

  stats.increment = increment
  stats.prefixKey = prefixKey
  stats.formatYYYMMDDDate = formatYYYMMDDDate

  return stats
}
