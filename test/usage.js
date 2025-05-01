'use strict'

const { setTimeout } = require('timers/promises')
const { withLock } = require('superlock')
const { randomUUID } = require('crypto')
const Redis = require('ioredis')
const test = require('ava')

const { testCleanup, PERIOD } = require('./helpers')

const redis = new Redis()

const openkey = require('openkey')({ redis, prefix: 'test-usage:' })

testCleanup({
  test,
  redis,
  keys: () =>
    Promise.all([
      redis.keys(openkey.keys.prefixKey('*')),
      redis.keys(openkey.plans.prefixKey('*')),
      redis.keys(openkey.usage.prefixKey('*'))
    ])
})

test('.get # error if key does not exist', async t => {
  const error = await t.throwsAsync(openkey.usage('value'))
  t.is(error.message, 'The key `value` does not exist.')
  t.is(error.name, 'OpenKeyError')
  t.is(error.code, 'ERR_KEY_NOT_EXIST')
})

test('.get # error if plan does not exist', async t => {
  const key = await openkey.keys.create()
  const error = await t.throwsAsync(openkey.usage(key.value))
  t.is(error.message, 'The plan `undefined` does not exist.')
  t.is(error.name, 'OpenKeyError')
  t.is(error.code, 'ERR_PLAN_NOT_EXIST')
})

test('.get', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: PERIOD
  })
  const key = await openkey.keys.create({ plan: plan.id })
  const usage = await openkey.usage(key.value)

  t.is(usage.limit, 3)
  t.is(usage.remaining, 3)
  t.true(usage.reset > Date.now())
  t.deepEqual(await Promise.resolve(usage.pending), [])
})

test('.increment', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: PERIOD
  })

  const key = await openkey.keys.create({ plan: plan.id })
  let data = await openkey.usage(key.value)
  t.is(data.remaining, 3)
  data = await openkey.usage.increment(key.value)
  await data.pending
  t.is(data.remaining, 2)
  data = await openkey.usage.increment(key.value)
  await data.pending
  t.is(data.remaining, 1)
  data = await openkey.usage.increment(key.value)
  await data.pending
  t.is(data.remaining, 0)
  data = await openkey.usage.increment(key.value)
  await data.pending
  t.is(data.remaining, 0)
  data = await openkey.usage.increment(key.value)
  await data.pending
  t.is(data.remaining, 0)
  await setTimeout(100)
  data = await openkey.usage(key.value)
  t.is(data.remaining, 3)
})

test(".increment # don't increment more than the limit", async t => {
  {
    const plan = await openkey.plans.create({
      id: randomUUID(),
      limit: 3,
      period: PERIOD
    })
    const key = await openkey.keys.create({ plan: plan.id })
    const usage = await openkey.usage.increment(key.value, { quantity: 10 })

    t.is(usage.limit, 3)
    t.is(usage.remaining, 0)
  }

  {
    const plan = await openkey.plans.create({
      id: randomUUID(),
      limit: 3,
      period: PERIOD
    })
    const key = await openkey.keys.create({ plan: plan.id })
    await openkey.usage.increment(key.value)
    const usage = await openkey.usage.increment(key.value, { quantity: 10 })

    t.is(usage.limit, 3)
    t.is(usage.remaining, 0)
  }
})

test('.increment # handle race conditions (using superlock)', async t => {
  const lock = withLock()

  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 1000,
    period: PERIOD
  })
  const key = await openkey.keys.create({ plan: plan.id })

  await Promise.all(
    [...Array(100).keys()].map(() =>
      lock(async () => {
        const { pending, ...usage } = await openkey.usage.increment(key.value)
        await pending
        return usage
      })
    )
  )

  const usage = await openkey.usage(key.value)
  t.is(usage.limit, 1000)
  t.is(usage.remaining, 900)
})
