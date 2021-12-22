import test from 'ava'
import IORedis from 'ioredis'
import Gateway from '../src/index'

test('test', async t => {
  const db = new IORedis(process.env.REDIS_URL, { password: process.env.REDIS_PASS })
  const gateway = new Gateway(db)
  // const plan = await gateway.plans.create({ id: '1', name: 'test', limit: 10, ttl: 60 })
  // if (!plan) t.fail()
  // console.log({ plan })
  const key = await gateway.keys.create({ planId: '1', id: '1', key: 'test', name: 'test' })
  console.log({ key })
  await gateway.usage('test')
})
