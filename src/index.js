'use strict'

const JSONB = require('json-buffer')

const createStats = require('./stats')
const createUsage = require('./usage')
const createPlans = require('./plans')
const createKeys = require('./keys')

module.exports = ({ serialize = JSONB.stringify, deserialize = JSONB.parse, redis = new Map(), prefix = '' } = {}) => {
  let _keys
  const stats = createStats({ redis, prefix })
  const plans = createPlans({ serialize, deserialize, redis, prefix, keys: () => _keys })
  const keys = (_keys = createKeys({ serialize, deserialize, redis, plans, prefix }))
  const usage = createUsage({ serialize, deserialize, redis, keys, plans, prefix, stats })
  return { keys, plans, usage, stats }
}
