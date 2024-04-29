'use strict'

const { setTimeout } = require('timers/promises')
const { randomUUID } = require('crypto')
const Redis = require('ioredis')
const test = require('ava')

const { testCleanup } = require('./helpers')

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
  t.is(error.code, 'KEY_NOT_EXIST')
})

test('.get # error if plan does not exist', async t => {
  const key = await openkey.keys.create()
  const error = await t.throwsAsync(openkey.usage(key.value))
  t.is(error.message, 'The plan `undefined` does not exist.')
  t.is(error.name, 'OpenKeyError')
  t.is(error.code, 'PLAN_NOT_EXIST')
})

test('.increment', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '100ms'
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
