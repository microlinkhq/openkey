<div align="center">
  <br>
  <img
    id="heading"
    src="https://raw.githubusercontent.com/microlinkhq/openkey/0bc4adb9e23583d5d373c1692c7b28358d18c7f8/static/images/head.png"
    alt="openkey"
    style="width: 350px;"
  >
  <h6 id="subhead">
    A scalable, cost-efficient, and high-performance authentication service
  </h6>
  <br>
  <p id="links">
    <img
      src="https://img.shields.io/github/tag/microlinkhq/openkey.svg?style=flat-square"
      alt="Last version"
    >
    <a
      href="https://coveralls.io/github/microlinkhq/openkey"
      target="_blank"
      rel="noopener noreferrer"
      class="no-external-icon"
    >
      <img
        src="https://img.shields.io/coveralls/microlinkhq/openkey.svg?style=flat-square"
        alt="Coverage Status"
      >
    </a>
    <a
      href="https://www.npmjs.org/package/openkey"
      target="_blank"
      rel="noopener noreferrer"
      class="no-external-icon"
    >
      <img
        src="https://img.shields.io/npm/dm/openkey.svg?style=flat-square"
        alt="NPM Status"
      >
    </a>
  </p>
</div>
<br>

Tired of not owning the authentication flow of your SaaS?

**openkey** is a ~200 lines backed in Redis for control authentication flow. You can deploy to any cloud provider, no vendor lock-in, being cheap at any scale & focused in performance to authenticate requests.

# Installation

First, Install **openkey** from your preferred node package manager:

```sh
pnpm install openkey
```

# CLI

**openkey** is also available as CLI when you install it globally in your system:

```sh
npm install -g openkey
```

After that, you can access to any command from your terminal:

```sh
❯ openkey
openkey> help
version exit keys plans usage stats
openkey> version
1.0.0
openkey> exit
```

# Usage

After installation, initialize **openkey**:

```js
const Redis = require('ioredis')
const redis = new Redis()
const openkey = require('openkey')({ redis })
```

you can prepend all the keys by passing `prefix`:

```js
const openkey = require('openkey')({ redis, prefix: 'http:' })
```

These will allow you to acess to **openkey** core concepts: **plans**, **keys**, **usage**, and **stats**.

## .plans

It represents the quota, rate limit, and throttle information specified as a plan.

### .create

It creates a new plan:

```js
/* A customer plan of 1M requests per month */
const plan = await openkey.plans.create({
  name: 'paid customers',
  limit: 1_000_000,
  period: '28d'
})

/* Associate an API key with the plan */
const key = await openkey.key.create({ plan: plan.id })
console.log(key.value) // => 'oKLJkVqqG2zExUYD'

/* use it in a HTTP flow */
module.exports = (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return send(res, 401)
  const { pending, ...usage } = await openkey.usage.increment(apiKey)
  const statusCode = usage.remaining > 0 ? 200 : 429
  res.setHeader('X-Rate-Limit-Limit', usage.limit)
  res.setHeader('X-Rate-Limit-Remaining', usage.remaining)
  res.setHeader('X-Rate-Limit-Reset', usage.reset)
  return send(res, statusCode, usage)
}
```

The **options** accepted are:

- `id`<span class="type">string</span>: The id of the plan, it cannot contain whitespaces.
- `period`<span class="type">string</span>: The time window which the limit applies. It accepts [ms](https://www.npmjs.com/package/ms) syntax.
- `limit`<span class="type">number</span>: The target maximum number of requests that can be made in a given time period.
- `metadata`<span class="type">object</span>: A flat object containing additional information. Pass `null` or `''` to remove all the metadata fields.

Any other field provided will be omitted.

**Returns**: an object with the options specified, plus:

- `createdAt`<span class="type">number</span>: The timestamp when the object was created.
- `updatedAt`<span class="type">number</span>: The last timestamp when the object was modified.

### .list

It retrieves all the plans:

```js
const plans = await openkey.plans.list()
```

### .retrieve

It retrieves a plan by id:

```js
const { createdAt, updatedAt, ...plan } = await openkey.plans.retrieve('free_tier')
```

**Returns**: the `plan` object, or `null` if it is not found.

### .update

It updates a plan by id:

```js
const { updatedAt, ...plan } = await openkey.plans.update('free_tier', {
  limit: 1000
})
```

You can't update the `id`. Also, in the same way than [.create](#create), any other field that is not a supported option will be omitted.

**Returns**: the updated `plan` object. If the plan is not found, this method will throw an error.

### .del

It deletes a plan by id:

```js
await openkey.plans.del('free_tier')
```

It will throw an error if:

- The plan has key associated. In that case, first keys needs to be deleted.
- The plan id doesn't exist.

**Returns** A boolean confirming the plan has been deleted.

## .keys

It represents the credentials used for authenticating a plan.

### .create

It creates a new key:

```js
/*
 * A random 16 length base58 key is created by default.
 */
const key = await openkey.key.create()
console.log(key.value) // => 'oKLJkVqqG2zExUYD'

/**
 * You can provide a value to use.
 */
const key = await openkey.key.create({ value: 'oKLJkVqqG2zExUYD' })

/**
 * The key can be associated with a plan when it's created.
 */
const key = await openkey.key.create({ value: 'oKLJkVqqG2zExUYD', plan: plan.id })
```

The **options** accepted are:

- `value`<span class="type">string</span>: The value of the key, being a base58 16 length key generated by default.
- `enabled`<span class="type">string</span>: It determines if the key is active, being `true` by default.
- `metadata`<span class="type">object</span>: A flat object containing additional information. Pass `null` or `''` to remove all the metadata fields.

Any other field provided will be omitted.

**Returns**: an object with the options specified, plus:

- `createdAt`<span class="type">number</span>: The timestamp when the object was created.
- `updatedAt`<span class="type">number</span>: The last timestamp when the object was modified.

### .retrieve

It retrieves a key by id:

```js
const { createdAt, updatedAt, ...key } = await openkey.key.retrieve('AN4fJ')
```

**Returns**: the `key` object, or `null` if it is not found.

### .update

It updates a key by id:

```js
const { updatedAt, ...key } = await openkey.key.update(value, {
  enabled: false
})
```

In the same way than [.create](#create-1), any other field that is not a supported option will be omitted.

**Returns**: the updated `key` object. If the key is not found, this method will throw an error.

### .del

It deletes a key by value:

```js
await openkey.plans.del(value)
```

It will throw an error if the key value doesn't exist.

**Returns** A boolean confirming the plan has been deleted.

## .usage

It returns the current usage of a key that is associated with a plan:

```js
const usage = await openkey.usage(key.value)
console.log(usage)
// {
//   limit: 3,
//   remaining: 3,
//   reset: 1714571966087,
//   pending: Promise { [] }
// }
```

### .increment

Similar to the previous method, but increments the usage by one before returning:

```js
const usage = await openkey.usage.increment(key.value)
// {
//   limit: 3,
//   remaining: 2,
//   reset: 1714571966087,
//   pending: Promise { [] }
// }
```

Additionally you can increment specifying the `quantity`:

```js
const usage = await openkey.usage.increment(key.value, { quantity: 3 })
// {
//   limit: 3,
//   remaining: 0,
//   reset: 1714571966087,
//   pending: Promise { [] }
// }
```

## .stats

It returns the count per every day for a given API key:

```js
const stats = await openkey.stats(key.value)
console.log(stats)
// [
//   { date: '2024-05-01', count: 1 },
//   { date: '2024-05-02', count: 10 },
//   { date: '2024-05-03', count: 5 }
// ]
```

# Compression & serialization

By default, **openkey** uses JSON serialization without compression for two reasons:

- The payload isn't large enough to take advantage of compression.
- Storing compressed data makes the content unreadable without first decompressing it.

You can customize `serialize` and `deserialize` when **openkey** is instantiated to define how you want your data to be handled.

For example, you can combine **openkey** with [compress-brotli](https://github.com/Kikobeats/compress-brotli) to store compressed data painlessly:

```js
const compressBrotli = require('compress-brotli')
const redis = new Redis()

const openkey = require('openkey')({
  redis,
  serialize: async data => brotli.serialize(await brotli.compress(data)),
  deserialize: data => brotli.decompress(brotli.deserialize(data))
})
```

# HTTP fields

**openkey** has been designed to play well according to [RateLimit header fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/):

```js
module.exports = (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) send(res, 401)
  const { pending, ...usage } = await openkey.usage.increment(apiKey)
  const statusCode = usage.remaining > 0 ? 200 : 429
  res.setHeader('X-Rate-Limit-Limit', usage.limit)
  res.setHeader('X-Rate-Limit-Remaining', usage.remaining)
  res.setHeader('X-Rate-Limit-Reset', usage.reset)
  return send(res, statusCode, usage)
}
```

# Stripe integration

![](https://b.stripecdn.com/docs-statics-srv/assets/usage-based-billing.7815fc3949e9351fd5e39cb2b02e4eca.svg)

**openkey** is about making pricing a part of your product development.

It's an excellent idea to combine it with [Stripe](https://stripe.com/):

```js
// https://docs.stripe.com/billing/subscriptions/usage-based/implementation-guide
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('sk_test_VZqeYMqkpa1bMxXyikghdPCu')

const count = await openkey.usage.get('{{CUSTOMER_KEY}}')

const meterEvent = await stripe.billing.meterEvents.create({
  event_name: 'alpaca_ai_tokens',
  payload: {
    value: count,
    stripe_customer_id: '{{CUSTOMER_ID}}'
  }
})
```

Read more about [Usage-based billing at Stripe](https://docs.stripe.com/billing/subscriptions/usage-based).

# Error handling

Every possible error thrown by **openkey** has the name `OpenKeyError` unique `code` associated with it.

```js
if (error.name === 'OpenKeyError') {
  return send(res, 400, { code: error.code, message: error.message })
} else {
  return send(res, 500)
}
```

This makes it easier to apply any kind of handling in your application logic.

You can find the [list errors in the source code](https://github.com/microlinkhq/openkey/blob/master/src/error.js).

# Design decisions

## Why Redis?

Mainly because it's a cheap in-memory database at scale, and mature enough to prevent vendor lock-in.

We considered other alternatives such as SQLite, but according to these requeriments Redis is a no brain choice.

## Why not TypeScript?

This library is intended to be used millions of times every day. We wanted to have granular control as much as possible, and adding a TypeScript transpilation layer isn't ideal from a performance and maintenance perspective.

## Why key/value?

Originally this library was implemented using [hashes](https://redis.io/docs/data-types/hashes), but then since values are stored as string, it's necessary to cast value (for example, from string to number).

Since we need to do that all the time, we prefer to use key/value. Also this approach allow to customize serializer/deserializer, which is JSON by default.

## Are writting operations atomic?

No, writes operations are not atomic because there are very few use cases where that matters. **openkey** is designed to process a constant stream of requests, where the only thing important to control reaching the limit of each plan.

In case you need it, you can combine **openkey** with [superlock](https://github.com/Kikobeats/superlock), check the following [example](https://github.com/microlinkhq/openkey/blob/9df977877e5066478020332bffb0c1677a5cd89e/test/usage.js#L115-L138).

# License

**openkey** © [microlink.io](https://microlink.io), released under the [MIT](https://github.com/microlinkhq/openkey/blob/master/LICENSE.md) License.<br>
Authored and maintained by [microlink.io](https://microlink.io) with help from [contributors](https://github.com/microlinkhq/openkey/contributors).

> [microlink.io](https://microlink.io) · GitHub [microlink.io](https://github.com/microlinkhq) · X [@microlinkhq](https://x.com/microlinkhq)
