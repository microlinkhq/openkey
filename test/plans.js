'use strict'

const { setTimeout } = require('timers/promises')
const { randomUUID } = require('crypto')
const Redis = require('ioredis')
const test = require('ava')

const { testCleanup } = require('./helpers')

const redis = new Redis()

const openkey = require('openkey')({ redis, prefix: 'test-plans:' })

testCleanup({
  test,
  redis,
  keys: () => Promise.all([redis.keys(openkey.plans.prefixKey('*'))])
})

test('.create # `id` is required', async t => {
  {
    const error = await t.throwsAsync(openkey.plans.create())
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(openkey.plans.create({ id: null }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(openkey.plans.create({ id: undefined }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(openkey.plans.create({ id: 0 }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(openkey.plans.create({ id: NaN }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(openkey.plans.create({ id: false }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
})

test('.create # the `id` already exist', async t => {
  const id = randomUUID()
  const props = { id, limit: 1, period: '1s', metadata: { tier: undefined } }
  const plan = await openkey.plans.create(props)
  t.is(typeof plan, 'object')
  const error = await t.throwsAsync(openkey.plans.create(props))
  t.is(error.message, `The plan \`${id}\` already exists.`)
  t.is(error.name, 'TypeError')
})

test('.create # `id` cannot contain whitespaces', async t => {
  const error = await t.throwsAsync(openkey.plans.create({ id: 'free tier' }))
  t.is(error.message, 'The argument `id` cannot contain whitespace.')
  t.is(error.name, 'TypeError')
})

test('.create # `limit` is required', async t => {
  const error = await t.throwsAsync(openkey.plans.create({ id: randomUUID() }))
  t.is(error.message, 'The argument `limit` must be a positive number.')
  t.is(error.name, 'TypeError')
})

test('.create # `period` is required', async t => {
  const error = await t.throwsAsync(openkey.plans.create({ id: randomUUID(), limit: 3 }))
  t.is(error.message, 'The argument `period` must be a string.')
  t.is(error.name, 'TypeError')
})

test('.create # `metadata` must be a flat object', async t => {
  {
    const error = await t.throwsAsync(
      openkey.plans.create({
        id: randomUUID(),
        limit: 1,
        period: '1s',
        metadata: { tier: { type: 'new' } }
      })
    )
    t.is(error.message, "The metadata field 'tier' can't be an object.")
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(
      openkey.plans.create({
        id: randomUUID(),
        limit: 1,
        period: '1s',
        metadata: 'foo'
      })
    )
    t.is(error.message, 'The metadata must be a flat object.')
    t.is(error.name, 'TypeError')
  }
})

test('.create # `metadata` as undefined is omitted', async t => {
  {
    const plan = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s',
      metadata: { tier: undefined }
    })
    t.is(plan.metadata, undefined)
  }
  {
    const plan = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s',
      metadata: { tier: 'free', version: undefined }
    })

    t.deepEqual(Object.keys(plan.metadata), ['tier'])
  }
})

test('.create', async t => {
  const id = randomUUID()
  const plan = await openkey.plans.create({
    id,
    limit: 1,
    period: '1s',
    metadata: { tier: 'free' },
    burst: 1000,
    rate: 10
  })

  t.truthy(plan.createdAt)
  t.is(plan.createdAt, plan.updatedAt)
  t.deepEqual(plan.metadata, { tier: 'free' })
  t.is(plan.period, '1s')
  t.is(plan.rate, 10)
  t.is(plan.burst, 1000)
  t.is(plan.limit, 1)
  t.is(plan.id, id)
})

test('.retrieve # a plan not previously created', async t => {
  t.is(await openkey.plans.retrieve(undefined), null)
  t.is(await openkey.plans.retrieve(false), null)
  t.is(await openkey.plans.retrieve(null), null)
  t.is(await openkey.plans.retrieve('1'), null)
})

test('.retrieve # a plan previously created', async t => {
  const { id } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const { createdAt, updatedAt, ...plan } = await openkey.plans.retrieve(id)
  t.deepEqual(plan, {
    id,
    limit: 1,
    period: '1s'
  })
})

test('.update', async t => {
  const { id, createdAt } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await openkey.plans.update(id, {
    id: randomUUID(),
    quota: { period: 'week' }
  })

  t.deepEqual(plan, {
    id,
    createdAt,
    limit: 1,
    period: '1s'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await openkey.plans.retrieve(id), { ...plan, updatedAt })
})

test(".update # don't update invalid `limit`", async t => {
  const { id, createdAt } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await openkey.plans.update(id, { limit: 0 })

  t.deepEqual(plan, {
    id,
    createdAt,
    limit: 1,
    period: '1s'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await openkey.plans.retrieve(id), { ...plan, updatedAt })
})

test(".update # don't update invalid `period`", async t => {
  const { id, createdAt } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await openkey.plans.update(id, { period: undefined })

  t.deepEqual(plan, {
    id,
    createdAt,
    limit: 1,
    period: '1s'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await openkey.plans.retrieve(id), { ...plan, updatedAt })
})

test('.update # add metadata', async t => {
  {
    const { id } = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await openkey.plans.update(id, { metadata: { tier: 'free' } })
    t.is(plan.metadata.tier, 'free')
  }
  {
    const { id } = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    await openkey.plans.update(id, { metadata: { tier: 'free' } })
    const plan = await openkey.plans.update(id, { metadata: { tier: 'free', version: 2 } })
    t.is(plan.metadata.tier, 'free')
    t.is(plan.metadata.version, 2)
  }
})

test('.update # metadata must be a flat object', async t => {
  const { id } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const error = await t.throwsAsync(openkey.plans.update(id, { metadata: { tier: { type: 'new' } } }))
  t.is(error.message, "The metadata field 'tier' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.update # metadata as undefined is omitted', async t => {
  {
    const { id } = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await openkey.plans.update(id, { metadata: { tier: undefined } })
    t.is(plan.metadata, undefined)
  }

  {
    const { id } = await openkey.plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await openkey.plans.update(id, { metadata: { tier: 'free', version: undefined } })
    t.deepEqual(Object.keys(plan.metadata), ['tier'])
  }
})

test('.update # prevent to add random data', async t => {
  const { id } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const plan = await openkey.plans.update(id, { foo: 'bar' })
  t.is(plan.foo, undefined)
})

test('.update # prevent to modify the plan id', async t => {
  const originalId = randomUUID()
  const { id } = await openkey.plans.create({
    id: originalId,
    limit: 1,
    period: '1s'
  })

  const plan = await openkey.plans.update(id, { id: randomUUID() })
  t.is(plan.id, originalId)
})

test('.update # error if plan does not exist', async t => {
  const error = await t.throwsAsync(openkey.plans.update('plan_id', { foo: 'bar' }))
  t.is(error.message, 'The plan `plan_id` does not exist.')
  t.is(error.name, 'TypeError')
})

test.serial('.list', async t => {
  const { id: id1 } = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const { id: id2 } = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const { id: id3 } = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const allPlans = await openkey.plans.list()
  const planIds = allPlans.map(plan => plan.id).sort()
  t.deepEqual(planIds, [id1, id2, id3].sort())
})

test('.del', async t => {
  const { id } = await openkey.plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  t.true(await openkey.plans.del(id))
  t.is(await openkey.plans.retrieve(id), null)
})

test('.del # error if plan does not exist', async t => {
  const error = await t.throwsAsync(openkey.plans.del('id'))
  t.is(error.message, 'The plan `id` does not exist.')
  t.is(error.name, 'TypeError')
})

test.serial('.del # error if a key is associated with the plan', async t => {
  const plan = await openkey.plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const key = await openkey.keys.create({ plan: plan.id })
  const error = await t.throwsAsync(openkey.plans.del(plan.id))

  t.is(error.message, `The plan \`${plan.id}\` is associated with the key \`${key.value}\`.`)
  t.is(error.name, 'TypeError')
})
