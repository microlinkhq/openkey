'use strict'

const { isPlainObject } = require('./util')
const assert = require('./assert')

const assertMetadata = metadata => {
  if (metadata) {
    assert(isPlainObject(metadata), 'ERR_METADATA_NOT_FLAT_OBJECT')
    Object.keys(metadata).forEach(key => {
      assert(!isPlainObject(metadata[key]), 'ERR_METADATA_INVALID', () => [key])
      if (metadata[key] === undefined) delete metadata[key]
    })

    return Object.keys(metadata).length ? metadata : false
  }
}

const clean = metadata => {
  for (const [key, value] of Object.entries(metadata)) {
    if ([null, ''].includes(value)) delete metadata[key]
  }
  return metadata
}

const merge = (metadata, newMetadata) => {
  if (newMetadata === null) return null
  const mergedMetadata = Object.assign({}, metadata, assertMetadata(newMetadata))
  return clean(mergedMetadata)
}

const mutate = (obj, opts) => {
  const metadata = merge(obj.metadata, opts.metadata)
  if (metadata === null || Object.keys(metadata).length === 0) delete obj.metadata
  else obj.metadata = metadata
  return obj
}

module.exports = mutate
