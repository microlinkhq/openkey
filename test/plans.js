import { setTimeout } from 'timers/promises'
import openkey from 'openkey'
import Redis from 'ioredis'
import test from 'ava'

import { PLAN_PREFIX } from 'openkey/plans'

const redis = new Redis()

const { plans } = openkey({ redis: new Redis() })

test.beforeEach(async () => {
  const keys = await redis.keys(`${PLAN_PREFIX}*`)
  if (keys.length > 0) await redis.del(keys)
})

test('.create # `name` is required', async t => {
  const error = await t.throwsAsync(plans.create())
  t.is(error.message, 'The argument `name` is required.')
  t.is(error.name, 'TypeError')
})

test('.create # `quota` is required', async t => {
  {
    const error = await t.throwsAsync(plans.create({ name: 'free tier' }))
    t.is(error.message, 'The argument `quota.period` must be `day` or `week` or `month`.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ name: 'free tier', quota: {} }))
    t.is(error.message, 'The argument `quota.period` must be `day` or `week` or `month`.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ name: 'free tier', quota: { period: 'today' } }))
    t.is(error.message, 'The argument `quota.period` must be `day` or `week` or `month`.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ name: 'free tier', quota: { period: 'week' } }))
    t.is(error.message, 'The argument `quota.limit` must be a positive number.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ name: 'free tier', quota: { period: 'week', limit: 0 } }))
    t.is(error.message, 'The argument `quota.limit` must be a positive number.')
    t.is(error.name, 'TypeError')
  }
})

test('.create', async t => {
  const plan = await plans.create({
    name: 'free tier',
    description: 'this is optional',
    metadata: { tier: 'free' },
    quota: { limit: 3000, period: 'day' },
    throttle: { burstLimit: 1000, rateLimit: 10 }
  })

  t.true(plan.id.startsWith('plan_'))
  t.truthy(plan.createdAt)
  t.is(plan.createdAt, plan.updatedAt)
  t.truthy(plan.description)
  t.deepEqual(plan.metadata, { tier: 'free' })
  t.deepEqual(plan.quota, { limit: 3000, period: 'day' })
  t.deepEqual(plan.throttle, { burstLimit: 1000, rateLimit: 10 })
})

test('.retrieve', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const { createdAt, updatedAt, ...plan } = await plans.retrieve(id)

  t.deepEqual(plan, {
    id,
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })
})

test('.update', async t => {
  const { id, createdAt } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await plans.update(id, {
    name: 'free tier',
    quota: { period: 'week' }
  })

  t.deepEqual(plan, {
    id,
    createdAt,
    name: 'free tier',
    quota: { limit: 3000, period: 'week' }
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await plans.retrieve(id), { ...plan, updatedAt })
})

test('.update # add metadata', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const plan = await plans.update(id, { metadata: { tier: 'free' } })
  t.is(plan.metadata.tier, 'free')
})

test('.update # prevent to add random data', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })
  const plan = await plans.update(id, { foo: 'bar' })
  t.is(plan.foo, undefined)
})

test('.update # error if plan does not exist', async t => {
  {
    const error = await t.throwsAsync(plans.update('id', { foo: 'bar' }))
    t.is(error.message, 'The id `id` must to start with `plan_`.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.update('plan_id', { foo: 'bar' }))
    t.is(error.message, 'The plan `plan_id` does not exist.')
    t.is(error.name, 'TypeError')
  }
})

test.serial('.list', async t => {
  const { id: id1 } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const { id: id2 } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const { id: id3 } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const planIds = (await plans.list()).map(plan => plan.id).sort()
  t.deepEqual(planIds, [id1, id2, id3].sort())
})

test('.del', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  t.true(await plans.del(id))
  t.is(await plans.retrieve(id), null)
})

test('.del # error if plan does not exist', async t => {
  const error = await t.throwsAsync(plans.del('plan_id'))
  t.is(error.message, 'The plan `plan_id` does not exist.')
  t.is(error.name, 'TypeError')
})
