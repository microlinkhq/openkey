'use strict'

const JSONB = require('json-buffer')
const createKeys = require('./keys')
const createPlans = require('./plans')

module.exports = ({ serialize = JSONB.stringify, deserialize = JSONB.parse, redis = new Map() } = {}) => {
  const plans = createPlans({ serialize, deserialize, redis })
  const keys = createKeys({ serialize, deserialize, redis, plans })
  return { keys, plans }
}
