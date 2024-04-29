'use strict'

const { isPlainObject } = require('./util')

class OpenKeyError extends Error {
  constructor (props) {
    super()
    this.name = 'OpenKeyError'
    Object.assign(this, props)
  }
}

const errors = [
  ['KEY_NOT_EXIST', key => `The key \`${key}\` does not exist.`],
  ['KEY_IS_ASSOCIATED', (id, value) => `The plan \`${id}\` is associated with the key \`${value}\`.`],
  ['PLAN_NOT_EXIST', plan => `The plan \`${plan}\` does not exist.`],
  ['PLAN_ID_REQUIRED', () => 'The argument `id` must be a string.'],
  ['PLAN_INVALID_ID', () => 'The argument `id` cannot contain whitespace.'],
  ['PLAN_INVALID_LIMIT', () => 'The argument `limit` must be a positive number.'],
  ['PLAN_INVALID_PERIOD', () => 'The argument `period` must be a string.'],
  ['PLAN_ALREADY_EXIST', plan => `The plan \`${plan}\` already exists.`],
  ['METADATA_NOT_FLAT_OBJECT', () => 'The metadata must be a flat object.'],
  ['METADATA_INVALID', key => `The metadata field '${key}' can't be an object.`]
].reduce((acc, [code, message]) => {
  acc[code] = args => new OpenKeyError({ code, message: message.apply(null, args()) })
  return acc
}, {})

const assert = (condition, code, args = () => []) => {
  return (
    condition ||
    (() => {
      throw errors[code](args)
    })()
  )
}

const assertMetadata = metadata => {
  if (metadata) {
    assert(isPlainObject(metadata), 'METADATA_NOT_FLAT_OBJECT')
    Object.keys(metadata).forEach(key => {
      assert(!isPlainObject(metadata[key]), 'METADATA_INVALID', () => [key])
      if (metadata[key] === undefined) delete metadata[key]
    })
    return Object.keys(metadata).length ? metadata : undefined
  }
}

module.exports = { errors, assert, assertMetadata }
