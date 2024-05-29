'use strict'

const { addDays } = require('date-fns')
const { randomUUID } = require('crypto')
const Redis = require('ioredis')
const test = require('ava')

const { testCleanup } = require('./helpers')

const redis = new Redis()

const openkey = require('openkey')({ redis, prefix: 'test-stats:' })

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

test.serial('.increment # by one', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '100ms'
  })

  const key = await openkey.keys.create({ plan: plan.id })
  let data = await openkey.usage.increment(key.value)
  await data.pending

  await Promise.all(
    [...Array(10).keys()].map(async () => {
      data = await openkey.usage.increment(key.value, { date: addDays(Date.now(), 1) })
      await data.pending
    })
  )

  await Promise.all(
    [...Array(5).keys()].map(async () => {
      data = await openkey.usage.increment(key.value, { date: addDays(Date.now(), 2) })
      await data.pending
    })
  )

  t.deepEqual(await openkey.stats(key.value), [
    { date: openkey.stats.formatYYYMMDDDate(), count: 1 },
    { date: openkey.stats.formatYYYMMDDDate(addDays(Date.now(), 1)), count: 10 },
    { date: openkey.stats.formatYYYMMDDDate(addDays(Date.now(), 2)), count: 5 }
  ])
})

test.serial('.increment # by more than one', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '100ms'
  })

  const key = await openkey.keys.create({ plan: plan.id })
  const data = await openkey.usage.increment(key.value)
  await data.pending

  await openkey.usage.increment(key.value, { quantity: 10, date: addDays(Date.now(), 1) })
  await data.pending

  await openkey.usage.increment(key.value, { quantity: 5, date: addDays(Date.now(), 2) })
  await data.pending

  t.deepEqual(await openkey.stats(key.value), [
    { date: openkey.stats.formatYYYMMDDDate(), count: 1 },
    { date: openkey.stats.formatYYYMMDDDate(addDays(Date.now(), 1)), count: 10 },
    { date: openkey.stats.formatYYYMMDDDate(addDays(Date.now(), 2)), count: 5 }
  ])
})
