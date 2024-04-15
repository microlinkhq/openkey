'use strict'

const { setTimeout } = require('timers/promises')
const { randomUUID } = require('crypto')
const openkey = require('openkey')
const Redis = require('ioredis')
const test = require('ava')

const redis = new Redis()

const { keys, plans } = openkey({ redis, prefix: 'test-plans:' })

const cleanup = async () => {
  const entries = await redis.keys(plans.prefixKey('*'))
  if (entries.length > 0) await redis.del(entries)
}

test.before(cleanup)
test.after(cleanup)
test.beforeEach(cleanup)

test('.create # `id` is required', async t => {
  {
    const error = await t.throwsAsync(plans.create())
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ id: null }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ id: undefined }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ id: 0 }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ id: NaN }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
  {
    const error = await t.throwsAsync(plans.create({ id: false }))
    t.is(error.message, 'The argument `id` must be a string.')
    t.is(error.name, 'TypeError')
  }
})

test('.create # `id` cannot contain whitespaces', async t => {
  const error = await t.throwsAsync(plans.create({ id: 'free tier' }))
  t.is(error.message, 'The argument `id` cannot contain whitespace.')
  t.is(error.name, 'TypeError')
})

test('.create # `limit` is required', async t => {
  const error = await t.throwsAsync(plans.create({ id: randomUUID() }))
  t.is(error.message, 'The argument `limit` must be a positive number.')
  t.is(error.name, 'TypeError')
})

test('.create # `period` is required', async t => {
  const error = await t.throwsAsync(plans.create({ id: randomUUID(), limit: 3 }))
  t.is(error.message, 'The argument `period` must be a string.')
  t.is(error.name, 'TypeError')
})

test('.create # `metadata` must be a flat object', async t => {
  {
    const error = await t.throwsAsync(
      plans.create({
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
      plans.create({
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
    const plan = await plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s',
      metadata: { tier: undefined }
    })
    t.is(plan.metadata, undefined)
  }
  {
    const plan = await plans.create({
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
  const plan = await plans.create({
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
  t.is(await plans.retrieve(undefined), null)
  t.is(await plans.retrieve(false), null)
  t.is(await plans.retrieve(null), null)
  t.is(await plans.retrieve('1'), null)
})

test('.retrieve # a plan previously created', async t => {
  const { id } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const { createdAt, updatedAt, ...plan } = await plans.retrieve(id)
  t.deepEqual(plan, {
    id,
    limit: 1,
    period: '1s'
  })
})

test('.update', async t => {
  const { id, createdAt } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await plans.update(id, {
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
  t.deepEqual(await plans.retrieve(id), { ...plan, updatedAt })
})

test(".update # don't update invalid `limit`", async t => {
  const { id, createdAt } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await plans.update(id, { limit: 0 })

  t.deepEqual(plan, {
    id,
    createdAt,
    limit: 1,
    period: '1s'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await plans.retrieve(id), { ...plan, updatedAt })
})

test(".update # don't update invalid `period`", async t => {
  const { id, createdAt } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...plan } = await plans.update(id, { period: undefined })

  t.deepEqual(plan, {
    id,
    createdAt,
    limit: 1,
    period: '1s'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await plans.retrieve(id), { ...plan, updatedAt })
})

test('.update # add metadata', async t => {
  {
    const { id } = await plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await plans.update(id, { metadata: { tier: 'free' } })
    t.is(plan.metadata.tier, 'free')
  }
  {
    const { id } = await plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    await plans.update(id, { metadata: { tier: 'free' } })
    const plan = await plans.update(id, { metadata: { tier: 'free', version: 2 } })
    t.is(plan.metadata.tier, 'free')
    t.is(plan.metadata.version, 2)
  }
})

test('.update # metadata must be a flat object', async t => {
  const { id } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const error = await t.throwsAsync(plans.update(id, { metadata: { tier: { type: 'new' } } }))
  t.is(error.message, "The metadata field 'tier' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.update # metadata as undefined is omitted', async t => {
  {
    const { id } = await plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await plans.update(id, { metadata: { tier: undefined } })
    t.is(plan.metadata, undefined)
  }

  {
    const { id } = await plans.create({
      id: randomUUID(),
      limit: 1,
      period: '1s'
    })

    const plan = await plans.update(id, { metadata: { tier: 'free', version: undefined } })
    t.deepEqual(Object.keys(plan.metadata), ['tier'])
  }
})

test('.update # prevent to add random data', async t => {
  const { id } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  const plan = await plans.update(id, { foo: 'bar' })
  t.is(plan.foo, undefined)
})

test('.update # prevent to modify the plan id', async t => {
  const originalId = randomUUID()
  const { id } = await plans.create({
    id: originalId,
    limit: 1,
    period: '1s'
  })

  const plan = await plans.update(id, { id: randomUUID() })
  t.is(plan.id, originalId)
})

test('.update # error if plan does not exist', async t => {
  const error = await t.throwsAsync(plans.update('plan_id', { foo: 'bar' }))
  t.is(error.message, 'The plan `plan_id` does not exist.')
  t.is(error.name, 'TypeError')
})

test.serial('.list', async t => {
  const { id: id1 } = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const { id: id2 } = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const { id: id3 } = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const allPlans = await plans.list()
  const planIds = allPlans.map(plan => plan.id).sort()
  t.deepEqual(planIds, [id1, id2, id3].sort())
})

test('.del', async t => {
  const { id } = await plans.create({
    id: randomUUID(),
    limit: 1,
    period: '1s'
  })

  t.true(await plans.del(id))
  t.is(await plans.retrieve(id), null)
})

test('.del # error if plan does not exist', async t => {
  const error = await t.throwsAsync(plans.del('id'))
  t.is(error.message, 'The plan `id` does not exist.')
  t.is(error.name, 'TypeError')
})

test.serial('.del # error if a key is associated with the plan', async t => {
  const plan = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const key = await keys.create({ plan: plan.id })
  const error = await t.throwsAsync(plans.del(plan.id))

  t.is(error.message, `The plan \`${plan.id}\` is associated with the key \`${key.value}\`.`)
  t.is(error.name, 'TypeError')
})
