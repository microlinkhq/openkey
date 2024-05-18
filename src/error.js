'use strict'

class OpenKeyError extends Error {
  constructor (props) {
    super()
    this.name = 'OpenKeyError'
    Object.assign(this, props)
  }
}

const errors = [
  ['ERR_KEY_NOT_EXIST', key => `The key \`${key}\` does not exist.`],
  ['ERR_KEY_IS_ASSOCIATED', (id, value) => `The plan \`${id}\` is associated with the key \`${value}\`.`],
  ['ERR_PLAN_NOT_EXIST', plan => `The plan \`${plan}\` does not exist.`],
  ['ERR_PLAN_ID_REQUIRED', () => 'The argument `id` must be a string.'],
  ['ERR_PLAN_INVALID_ID', () => 'The argument `id` cannot contain whitespace.'],
  ['ERR_PLAN_INVALID_LIMIT', () => 'The argument `limit` must be a positive number.'],
  ['ERR_PLAN_INVALID_PERIOD', () => 'The argument `period` must be a string.'],
  ['ERR_PLAN_ALREADY_EXIST', plan => `The plan \`${plan}\` already exists.`],
  ['ERR_METADATA_NOT_FLAT_OBJECT', () => 'The metadata must be a flat object.'],
  ['ERR_METADATA_INVALID', key => `The metadata field '${key}' can't be an object.`]
].reduce((acc, [code, message]) => {
  acc[code] = args => new OpenKeyError({ code, message: message.apply(null, args()) })
  return acc
}, {})

module.exports = { errors }
