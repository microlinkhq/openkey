'use strict'

const { randomUUID } = require('crypto')
const Redis = require('ioredis')
const test = require('ava')

const { testCleanup } = require('./helpers')

const redis = new Redis()

const openkey = require('openkey')({ redis, prefix: 'test-compression:' })

testCleanup({
  test,
  redis,
  keys: () => Promise.all([redis.keys(openkey.plans.prefixKey('*'))])
})

test('compression support', async t => {
  const brotli = require('compress-brotli')()

  const openkey = require('openkey')({
    redis,
    prefix: 'test-compression:',
    serialize: async data => brotli.serialize(await brotli.compress(data)),
    deserialize: data => brotli.decompress(brotli.deserialize(data))
  })

  const id = randomUUID()

  const props = {
    id,
    limit: 1,
    period: '1s',
    metadata: { tier: 'free' }
  }

  await openkey.plans.create(props)

  const { createdAt, updatedAt, ...plan } = await openkey.plans.retrieve(id)

  const raw = await redis.get(openkey.plans.prefixKey(id))

  t.true(raw.startsWith('":base64:'))
  t.deepEqual(plan, props)
})
