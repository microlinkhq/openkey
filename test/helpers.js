'use strict'

const PERIOD = '150ms'

const testCleanup = async ({ test, redis, keys }) => {
  const cleanup = async () => {
    const entries = await keys()
    if (entries.length > 0) {
      const pipeline = redis.pipeline()
      entries.forEach(entry => pipeline.del(entry))
      await pipeline.exec()
    }
  }

  test.before(cleanup)
  test.after(cleanup)
  test.beforeEach(cleanup)
}

module.exports = { testCleanup, PERIOD }
