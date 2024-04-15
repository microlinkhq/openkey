'use strict'

const { setTimeout } = require('timers/promises')
const { randomUUID } = require('crypto')
const openkey = require('openkey')
const Redis = require('ioredis')
const test = require('ava')

const redis = new Redis()

const { keys, plans } = openkey({ redis, prefix: 'test-keys:' })

const cleanup = async () => {
  const entries = await redis.keys(keys.prefixKey('*'))
  if (entries.length > 0) await redis.del(entries)
}

test.before(cleanup)
test.after(cleanup)
test.beforeEach(cleanup)

test('.create # `metadata` must be a flat object', async t => {
  const error = await t.throwsAsync(keys.create({ metadata: { tier: { type: 'new' } } }))
  t.is(error.message, "The metadata field 'tier' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.create # `metadata` as undefined is omitted', async t => {
  const key = keys.create({ metadata: { cc: undefined } })
  t.is(key.metadata, undefined)
})

test('.create # error if plan does not exist', async t => {
  const error = await t.throwsAsync(keys.create({ plan: '123' }))
  t.is(error.message, 'The plan `123` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.create', async t => {
  const key = await keys.create()
  t.truthy(key.createdAt)
  t.is(key.createdAt, key.updatedAt)
  t.is(key.value.length, 16)
  t.true(key.enabled)
})

test('.create # associate a plan', async t => {
  const plan = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })

  const key = await keys.create({ plan: plan.id })

  t.truthy(key.value)
  t.truthy(key.createdAt)
  t.is(key.createdAt, key.updatedAt)
  t.is(key.value.length, 16)
  t.true(key.enabled)
})

test('.retrieve # a key previously created', async t => {
  const { value } = await keys.create()
  const { createdAt, updatedAt, ...key } = await keys.retrieve(value)
  t.deepEqual(key, {
    enabled: true,
    value
  })
})

test('.retrieve # a key not previously created', async t => {
  t.is(await keys.retrieve(undefined), null)
  t.is(await keys.retrieve(false), null)
  t.is(await keys.retrieve(null), null)
  t.is(await keys.retrieve('1'), null)
})

test('.update', async t => {
  const { value, createdAt } = await keys.create()

  await setTimeout(0) // ensure time move forward

  const { updatedAt, ...key } = await keys.update(value, { enabled: false })

  t.deepEqual(key, {
    value,
    createdAt,
    enabled: false
  })

  t.true(updatedAt > createdAt)
  t.deepEqual(await keys.retrieve(value), { ...key, updatedAt })
})

test('.update # error if key does not exist', async t => {
  const error = await t.throwsAsync(keys.update('value'))
  t.is(error.message, 'The key `value` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.update # error if plan does not exist', async t => {
  const { value } = await keys.create()
  const error = await t.throwsAsync(keys.update(value, { plan: 'id' }))
  t.is(error.message, 'The plan `id` does not exist.')
  t.is(error.name, 'TypeError')
})

test('.update # add a plan', async t => {
  const plan = await plans.create({
    id: randomUUID(),
    limit: 3,
    period: '10s'
  })
  const { value } = await keys.create()
  const key = await keys.update(value, { plan: plan.id })
  t.is(key.plan, plan.id)
})

test('.update # add metadata', async t => {
  {
    const { value } = await keys.create()
    const key = await keys.update(value, { metadata: { cc: 'hello@microlink.io' } })
    t.is(key.metadata.cc, 'hello@microlink.io')
  }
  {
    const { value } = await keys.create()
    await keys.update(value, { metadata: { cc: 'hello@microlink.io' } })
    const key = await keys.update(value, { metadata: { cc: 'hello@microlink.io', version: 2 } })

    t.is(key.metadata.cc, 'hello@microlink.io')
    t.is(key.metadata.version, 2)
  }
})

test('.update # metadata must be a flat object', async t => {
  const { value } = await keys.create()
  const error = await t.throwsAsync(keys.update(value, { metadata: { email: { cc: 'hello@microlink.io' } } }))
  t.is(error.message, "The metadata field 'email' can't be an object.")
  t.is(error.name, 'TypeError')
})

test('.update # metadata as undefined is omitted', async t => {
  {
    const { value } = await keys.create()
    const key = await keys.update(value, { metadata: { email: undefined } })
    t.is(key.metadata, undefined)
  }
  {
    const { value } = await keys.create()
    const key = await keys.update(value, { metadata: { cc: 'hello@microlink.io', bcc: undefined } })
    t.deepEqual(Object.keys(key.metadata), ['cc'])
  }
})

test('.update # prevent to add random data', async t => {
  const { value } = await keys.create()
  const key = await keys.update(value, { foo: 'bar' })

  t.is(key.foo, undefined)
})

test.serial('.list', async t => {
  const { value: value1 } = await keys.create()
  const { value: value2 } = await keys.create()
  const { value: value3 } = await keys.create()

  const allKeys = await keys.list()

  allKeys.forEach(key => {
    t.deepEqual(Object.keys(key), ['value', 'enabled', 'updatedAt', 'createdAt'])
    t.false(key.value.startsWith('key_'))
  })

  const keyValues = allKeys.map(key => key.value).sort()
  t.deepEqual(keyValues, [value1, value2, value3].sort())
})

test('.del', async t => {
  {
    const { value } = await keys.create()

    t.true(await keys.del(value))
    t.is(await keys.retrieve(value), null)
  }
  {
    const { value } = await keys.create({ plan: null })
    t.true(await keys.del(value))
    t.is(await keys.retrieve(value), null)
  }
})

test('.del # error if key does not exist', async t => {
  const error = await t.throwsAsync(keys.del('key_id'))

  t.is(error.message, 'The key `key_id` does not exist.')
  t.is(error.name, 'TypeError')
})

// test('.del # error plan associated exist', async t => {
//   const plan = await plans.create({
//     id: 'pro',
//     limit: 3,
//     period: '10s'
//   })
//   const { value } = await keys.create({ plan: plan.id })
//   const error = await t.throwsAsync(keys.del(value))
//   t.true(error.message.includes('is associated with the plan'))
//   t.is(error.name, 'TypeError')
// })
