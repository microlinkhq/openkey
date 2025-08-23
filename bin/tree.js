'use strict'

const { gray } = require('./style')

const descriptions = {
  'keys.create': 'create a new key',
  'keys.del': 'delete a key',
  'keys.list': 'list all keys',
  'keys.prefixKey': 'prefix a key',
  'keys.retrieve': 'retrieve a key',
  'keys.update': 'update a key',
  'plans.create': 'create a new plan',
  'plans.del': 'delete a plan',
  'plans.list': 'list all plans',
  'plans.prefixKey': 'prefix a plan',
  'plans.retrieve': 'retrieve a plan',
  'plans.update': 'update a plan',
  exit: 'exit the program',
  keys: 'manage keys',
  plans: 'manage plans',
  stats: 'get the stats of the openkey',
  uid: 'generate an unique id',
  usage: 'get the usage of a key',
  version: 'print the version of the openkey'
}

const tree = (obj, prefix = '', parentPath = '') => {
  if (obj == null) return String(obj)
  if (typeof obj !== 'object') return String(obj)
  if (Array.isArray(obj)) return '[]'

  const keys = Object.keys(obj).sort()
  if (keys.length === 0) return '{}'

  let result = ''
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1
    const connector = gray(isLast ? '└── ' : '├── ')
    const childPrefix = prefix + (isLast ? '    ' : gray('│   '))

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
      result += `${prefix}${connector}${key}${gray(':')} ${value}${descriptionText}\n`
    }
  })

  return result.slice(0, -1) // Remove trailing newline
}

module.exports = tree
