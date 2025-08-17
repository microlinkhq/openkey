'use strict'

const { gray } = require('./style')

const descriptions = {
  version: 'print the version of the openkey',
  exit: 'exit the program',
  keys: 'manage keys',
  'keys.create': 'create a new key',
  'keys.retrieve': 'retrieve a key',
  'keys.del': 'delete a key',
  'keys.update': 'update a key',
  'keys.list': 'list all keys',
  'keys.prefixKey': 'prefix a key',
  plans: 'manage plans',
  'plans.create': 'create a new plan',
  'plans.del': 'delete a plan',
  'plans.retrieve': 'retrieve a plan',
  'plans.update': 'update a plan',
  'plans.list': 'list all plans',
  'plans.prefixKey': 'prefix a plan',
  usage: 'get the usage of a key',
  stats: 'get the stats of the openkey'
}

const tree = (obj, prefix = '', parentPath = '') => {
  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'

  const type = typeof obj

  if (type === 'string') return `"${obj}"`
  if (type === 'number' || type === 'boolean') return String(obj)
  if (type === 'function') return obj.name || 'anonymous'
  if (obj instanceof Date) return `[Date: ${obj.toISOString()}]`
  if (Buffer.isBuffer(obj)) return `[Buffer: ${obj.length} bytes]`

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'

    let result = ''
    obj.forEach((item, index) => {
      const itemIsLast = index === obj.length - 1
      const connector = gray(itemIsLast ? '└── ' : '├── ')
      const childPrefix = prefix + (itemIsLast ? '    ' : gray('│   '))
      result += `${prefix}${connector}${index}${gray(':')} ${tree(item, childPrefix, parentPath)}\n`
    })
    return result.slice(0, -1) // Remove trailing newline
  }

  if (type === 'object') {
    const keys = Object.keys(obj)
    if (keys.length === 0) return '{}'

    let result = ''
    keys.forEach((key, index) => {
      const keyIsLast = index === keys.length - 1
      const connector = gray(keyIsLast ? '└── ' : '├── ')
      const childPrefix = prefix + (keyIsLast ? '    ' : gray('│   '))

      try {
        const value = obj[key]
        const currentPath = parentPath ? `${parentPath}.${key}` : key
        const description = descriptions[currentPath] || descriptions[key] || ''
        const descriptionText = description ? gray(` ${description}`) : ''

        if (typeof value === 'function') {
          result += `${prefix}${connector}${key}${descriptionText}\n`
        } else if (typeof value === 'object' && value !== null) {
          result += `${prefix}${connector}${key}${descriptionText}\n`
          const childTree = tree(value, childPrefix, currentPath)
          if (childTree && !childTree.includes('{}')) {
            result += childTree + '\n'
          }
        } else {
          result += `${prefix}${connector}${key}${gray(':')} ${tree(
            value,
            childPrefix,
            currentPath
          )}${descriptionText}\n`
        }
      } catch (error) {
        result += `${prefix}${connector}${key}${gray(':')} [Error: ${error.message}]\n`
      }
    })
    return result.slice(0, -1) // Remove trailing newline
  }

  return `[${type}]`
}

module.exports = tree
