'use strict'

const JSONB = require('json-buffer')
const createKeys = require('./keys')
const createPlans = require('./plans')

module.exports = ({ serialize = JSONB.stringify, deserialize = JSONB.parse, redis = new Map(), prefix = '' } = {}) => {
  let _keys
  const plans = createPlans({ serialize, deserialize, redis, prefix, keys: () => _keys })
  const keys = (_keys = createKeys({ serialize, deserialize, redis, plans, prefix }))
  return { keys, plans }
}
