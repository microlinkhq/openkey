'use strict'

const { setTimeout } = require('timers/promises')
const openkey = require('openkey')
const Redis = require('ioredis')
const test = require('ava')

const { KEY_PREFIX } = require('openkey/keys')

const redis = new Redis()

const { keys, plans } = openkey({ redis: new Redis() })

test.beforeEach(async () => {
  const keys = await redis.keys(`${KEY_PREFIX}*`)
  if (keys.length > 0) await redis.del(keys)
})

test('.create # `name` is required', async t => {
  const error = await t.throwsAsync(keys.create())

  t.is(error.message, 'The argument `name` is required.')
  t.is(error.name, 'TypeError')
})

test('.create # `metadata` must be a flat object', async t => {
  const error = await t.throwsAsync(keys.create({ name: 'hello@microlink.io', metadata: { tier: { type: 'new' } } }))

  t.is(error.message, "The metadata field 'tier' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.create # `metadata` as undefined is omitted', async t => {
  const key = keys.create({ name: 'hello@microlink.io', metadata: { cc: undefined } })

  t.is(key.metadata, undefined)
})

test('.create # error if plan is invalid', async t => {
  const error = await t.throwsAsync(keys.create({ name: 'hello@microlink.io', plan: 123 }))

  t.is(error.message, 'The id `123` must to start with `plan_`.')
  t.is(error.name, 'TypeError')
})

test('.create # error if plan does not exist', async t => {
  const error = await t.throwsAsync(keys.create({ name: 'hello@microlink.io', plan: 'plan_123' }))

  t.is(error.message, 'The plan `plan_123` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.create', async t => {
  const key = await keys.create({ name: 'hello@microlink.io' })

  t.true(key.id.startsWith('key_'))
  t.truthy(key.createdAt)
  t.is(key.createdAt, key.updatedAt)
  t.is(key.value.length, 16)
  t.true(key.enabled)
})

test('.create # associate a plan', async t => {
  const plan = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const key = await keys.create({ name: 'hello@microlink.io', plan: plan.id })

  t.true(key.id.startsWith('key_'))
  t.truthy(key.createdAt)
  t.is(key.createdAt, key.updatedAt)
  t.is(key.value.length, 16)
  t.true(key.enabled)
})

test('.retrieve # a key previously created', async t => {
  const { id, value } = await keys.create({ name: 'hello@microlink.io' })

  const { createdAt, updatedAt, ...key } = await keys.retrieve(id)

  t.deepEqual(key, {
    id,
    enabled: true,
    name: 'hello@microlink.io',
    value
  })
})

test('.retrieve # a key not previously created', async t => {
  t.is(await keys.retrieve('key_1'), null)
})

test('.update', async t => {
  const { id, value, createdAt } = await keys.create({
    name: 'hello@microlink.io'
  })

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...key } = await keys.update(id, {
    description: 'new description',
    enabled: false
  })

  t.deepEqual(key, {
    id,
    value,
    createdAt,
    enabled: false,
    name: 'hello@microlink.io',
    description: 'new description'
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await keys.retrieve(id), { ...key, updatedAt })
})

test('.update # error if key is invalid', async t => {
  const error = await t.throwsAsync(keys.update('id', { foo: 'bar' }))
  t.is(error.message, 'The id `id` must to start with `key_`.')
  t.is(error.name, 'TypeError')
})

test('.update # error if key does not exist', async t => {
  const error = await t.throwsAsync(keys.update('key_id'))
  t.is(error.message, 'The key `key_id` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.update # error if plan is invalid', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const error = await t.throwsAsync(keys.update(id, { plan: 'id' }))
  t.is(error.message, 'The id `id` must to start with `plan_`.')
  t.is(error.name, 'TypeError')
})

test('.update # error if plan does not exist', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const error = await t.throwsAsync(keys.update(id, { plan: 'plan_id' }))
  t.is(error.message, 'The plan `plan_id` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.update # add a plan', async t => {
  const plan = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const key = await keys.update(id, { plan: plan.id })

  t.is(key.plan, plan.id)
})

test('.update # add metadata', async t => {
  {
    const { id } = await keys.create({ name: 'hello@microlink.io' })
    const key = await keys.update(id, { metadata: { cc: 'hello@microlink.io' } })
    t.is(key.metadata.cc, 'hello@microlink.io')
  }
  {
    const { id } = await keys.create({ name: 'hello@microlink.io' })
    await keys.update(id, { metadata: { cc: 'hello@microlink.io' } })
    const key = await keys.update(id, { metadata: { cc: 'hello@microlink.io', version: 2 } })

    t.is(key.metadata.cc, 'hello@microlink.io')
    t.is(key.metadata.version, 2)
  }
})

test('.update # metadata must be a flat object', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const error = await t.throwsAsync(keys.update(id, { metadata: { email: { cc: 'hello@microlink.io' } } }))
  t.is(error.message, "The metadata field 'email' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.update # metadata as undefined is omitted', async t => {
  {
    const { id } = await keys.create({ name: 'hello@microlink.io' })
    const key = await keys.update(id, { metadata: { email: undefined } })
    t.is(key.metadata, undefined)
  }
  {
    const { id } = await keys.create({ name: 'hello@microlink.io' })
    const key = await keys.update(id, { metadata: { cc: 'hello@microlink.io', bcc: undefined } })
    t.deepEqual(Object.keys(key.metadata), ['cc'])
  }
})

test('.update # prevent to add random data', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const key = await keys.update(id, { foo: 'bar' })

  t.is(key.foo, undefined)
})

test('.update # prevent to modify the key id', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const key = await keys.update(id, { id: 'foo' })

  t.is(key.id, id)
})

test.serial('.list', async t => {
  const { id: id1 } = await keys.create({ name: 'hello@microlink.io' })
  const { id: id2 } = await keys.create({ name: 'hello@microlink.io' })
  const { id: id3 } = await keys.create({ name: 'hello@microlink.io' })

  const keyIds = (await keys.list()).map(plan => plan.id).sort()

  t.deepEqual(keyIds, [id1, id2, id3].sort())
})

test('.del', async t => {
  {
    const { id } = await keys.create({ name: 'hello@microlink.io' })

    t.true(await keys.del(id))
    t.is(await keys.retrieve(id), null)
  }
  {
    const { id } = await keys.create({ name: 'hello@microlink.io', plan: null })
    t.true(await keys.del(id))
    t.is(await keys.retrieve(id), null)
  }
})

test('.del # error if key does not exist', async t => {
  const error = await t.throwsAsync(keys.del('key_id'))

  t.is(error.message, 'The key `key_id` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.del # error plan associated exist', async t => {
  const plan = await plans.create({
    name: 'free tier',
    quota: { limit: 3000, period: 'day' }
  })

  const { id } = await keys.create({
    name: 'hello@microlink.io',
    plan: plan.id
  })
  const error = await t.throwsAsync(keys.del(id))

  t.true(error.message.includes('is associated with the plan'))
  t.is(error.name, 'TypeError')
})
