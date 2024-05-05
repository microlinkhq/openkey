'use strict'

const { styleText } = require('node:util')
const { once } = require('node:events')
const { json } = require('http-body')

const Redis = require('ioredis')
const http = require('http')

const redis = new Redis()
const openkey = require('../..')({ redis, prefix: 'test-http:' })

const createSend = req => (res, statusCode, body) => {
  console.log(`~> ${req.method} ${req.url} (${statusCode})`)
  return require('send-http')(res, statusCode, body)
}

const server = http.createServer(async (req, res) => {
  const send = createSend(req)

  try {
    if (req.url === '/keys/create') {
      const options = await json(req)
      const result = await openkey.keys.create(options)
      return send(res, 201, result)
    }

    if (req.url.startsWith('/keys/key_')) {
      const key = req.url.split('/keys/')[1]
      const result = await openkey.keys.retrieve(key)
      return send(res, 200, result)
    }

    if (req.url === '/plans/create') {
      const options = await json(req)
      const result = await openkey.plans.create(options)
      return send(res, 201, result)
    }

    if (req.url.startsWith('/usage/')) {
      const keyValue = req.url.split('/usage/')[1]
      const { pending, ...usage } = await openkey.usage.increment(keyValue)
      const statusCode = usage.remaining > 0 ? 200 : 429
      res.setHeader('X-Rate-Limit-Limit', usage.limit)
      res.setHeader('X-Rate-Limit-Remaining', usage.remaining)
      res.setHeader('X-Rate-Limit-Reset', usage.reset)
      return send(res, statusCode, usage)
    }

    if (req.url.startsWith('/stats/')) {
      const keyValue = req.url.split('/stats/')[1]
      const stats = await openkey.stats(keyValue)
      return send(res, 200, stats)
    }

    return send(res, 400)
  } catch (error) {
    if (error.name === 'OpenKeyError') {
      return send(res, 400, { code: error.code, message: error.message })
    }
    console.log('   ' + styleText('red', `ERROR: ${error.message}`))
    return send(res, 500)
  }
})

const listen = async (server, port, callback) => {
  try {
    server.listen(port)
    await once(server, 'listening')
    return callback(port)
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use`)
      return listen(server, ++port, callback)
    } else {
      throw error
    }
  }
}

listen(server, 3000, port => {
  console.log(`Server is listening on port http://localhost:${port}`)
})
