'use strict'

import { setTimeout } from 'timers/promises'
import openkey from 'openkey'
import Redis from 'ioredis'
import test from 'ava'

import { KEY_PREFIX } from 'openkey/keys'

const redis = new Redis()

const { keys } = openkey({ redis: new Redis() })

test.beforeEach(async () => {
  const keys = await redis.keys(`${KEY_PREFIX}*`)
  if (keys.length > 0) await redis.del(keys)
})

test('.create # `name` is required', async t => {
  const error = await t.throwsAsync(keys.create())
  t.is(error.message, 'The argument `name` is required.')
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

test('.retrieve', async t => {
  const { id, value } = await keys.create({ name: 'hello@microlink.io' })

  const { createdAt, updatedAt, ...key } = await keys.retrieve(id)

  t.deepEqual(key, {
    id,
    enabled: true,
    name: 'hello@microlink.io',
    value
  })
})

test('.update', async t => {
  const { id, value, createdAt } = await keys.create({ name: 'hello@microlink.io' })

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

test('.update # add metadata', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const plan = await keys.update(id, { metadata: { cc: 'hello@microlink.io' } })
  t.is(plan.metadata.cc, 'hello@microlink.io')
})

test('.update # prevent to add random data', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  const key = await keys.update(id, { foo: 'bar' })
  t.is(key.foo, undefined)
})

test.serial('.list', async t => {
  const { id: id1 } = await keys.create({ name: 'hello@microlink.io' })

  const { id: id2 } = await keys.create({ name: 'hello@microlink.io' })

  const { id: id3 } = await keys.create({ name: 'hello@microlink.io' })

  const keyIds = (await keys.list()).map(plan => plan.id).sort()
  t.deepEqual(keyIds, [id1, id2, id3].sort())
})

test('.del', async t => {
  const { id } = await keys.create({ name: 'hello@microlink.io' })
  t.true(await keys.del(id))
  t.is(await keys.retrieve(id), null)
})

test('.del # error if plan does not exist', async t => {
  const error = await t.throwsAsync(keys.del('key_id'))
  t.is(error.message, 'The key `key_id` does not exist.')
  t.is(error.name, 'TypeError')
})

// test.todo('associate a key with a plan')
// test.todo('throw an error trying to delete a plan with keys associated')
