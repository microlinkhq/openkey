import JSONB from 'json-buffer'

import createKeys from './keys.js'
import createPlans from './plans.js'

export default ({
  serialize = JSONB.stringify,
  deserialize = JSONB.parse,
  redis = new Map()
} = {}) => {
  if (!redis) throw TypeError('The argument `store` is required.')
  const plans = createPlans({ serialize, deserialize, redis })
  const keys = createKeys({ serialize, deserialize, redis, plans })
  return { keys, plans }
}
