'use strict'

const { setTimeout } = require('timers/promises')
const openkey = require('openkey')
const Redis = require('ioredis')
const test = require('ava')

const { PLAN_PREFIX } = require('openkey/plans')

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

test('.create # `metadata` must be a flat object', async t => {
  {
    const error = await t.throwsAsync(
      plans.create({
        name: 'free tier',
        quota: { period: 'week', limit: 1000 },
        metadata: { tier: { type: 'new' } }
      })
    )
    t.is(error.message, "The metadata field 'tier' can't be an object.")
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(
      plans.create({
        name: 'free tier',
        quota: { period: 'week', limit: 1000 },
        metadata: 'foo'
      })
    )
    t.is(error.message, 'The metadata must be a flat object.')
    t.is(error.name, 'TypeError')
  }
})

test('.create # `metadata` as undefined is omitted', async t => {
  {
    const plan = await plans.create({
      name: 'free tier',
      quota: { period: 'week', limit: 1000 },
      metadata: { tier: undefined }
    })
    t.is(plan.metadata, undefined)
  }
  {
    const plan = await plans.create({
      name: 'free tier',
      quota: { period: 'week', limit: 1000 },
      metadata: { tier: 'free', version: undefined }
    })

    t.deepEqual(Object.keys(plan.metadata), ['tier'])
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

test('.retrieve # a plan not previously created', async t => {
  t.is(await plans.retrieve('plan_1'), null)
})

test('.retrieve # a plan previously created', async t => {
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
  {
    const { id } = await plans.create({
      name: 'free tier',
      quota: { limit: 3000, period: 'day' }
    })

    const plan = await plans.update(id, { metadata: { tier: 'free' } })
    t.is(plan.metadata.tier, 'free')
  }
  {
    const { id } = await plans.create({
      name: 'free tier',
      quota: { limit: 3000, period: 'day' }
    })

    await plans.update(id, { metadata: { tier: 'free' } })
    const plan = await plans.update(id, { metadata: { tier: 'free', version: 2 } })
    t.is(plan.metadata.tier, 'free')
    t.is(plan.metadata.version, 2)
  }
})

test('.update # metadata must be a flat object', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const error = await t.throwsAsync(plans.update(id, { metadata: { tier: { type: 'new' } } }))
  t.is(error.message, "The metadata field 'tier' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.update # metadata as undefined is omitted', async t => {
  {
    const { id } = await plans.create({
      name: 'free tier',
      quota: { limit: 3000, period: 'day' }
    })

    const plan = await plans.update(id, { metadata: { tier: undefined } })
    t.is(plan.metadata, undefined)
  }

  {
    const { id } = await plans.create({
      name: 'free tier',
      quota: { limit: 3000, period: 'day' }
    })

    const plan = await plans.update(id, { metadata: { tier: 'free', version: undefined } })
    t.deepEqual(Object.keys(plan.metadata), ['tier'])
  }
})

test('.update # prevent to add random data', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })
  const plan = await plans.update(id, { foo: 'bar' })
  t.is(plan.foo, undefined)
})

test('.update # prevent to modify the plan id', async t => {
  const { id } = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const plan = await plans.update(id, { id: 'foo' })

  t.is(plan.id, id)
})

test('.update # error if plan is invalid', async t => {
  const error = await t.throwsAsync(plans.update('id', { foo: 'bar' }))
  t.is(error.message, 'The id `id` must to start with `plan_`.')
  t.is(error.name, 'TypeError')
})

test('.update # error if plan does not exist', async t => {
  const error = await t.throwsAsync(plans.update('plan_id', { foo: 'bar' }))
  t.is(error.message, 'The plan `plan_id` does not exist.')
  t.is(error.name, 'TypeError')
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
