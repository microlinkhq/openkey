'use strict'

const openkey = require('openkey')
const Redis = require('ioredis')
const mri = require('mri')

const { createCommandHistoryManager } = require('./history')
const { createSmartRepl } = require('./repl')

const historyManager = createCommandHistoryManager()

// REPL instance will be set after creation
let replInstance = null

const { prefix, _: uri } = mri(process.argv.slice(2))

const redis = new Redis(uri)

const { uid, ...openkeyCommands } = openkey({ redis, prefix })

console.log(`Connected to ${uri ?? `redis://${redis.options.host}:${redis.options.port || 6379}`}`)

const commands = Object.assign(
  {
    version: () => require('../package.json').version,
    exit: () => process.exit(),
    help: () => require('./tree')(commands),
    history: {
      show: () => {
        const { totalCommands, uniqueCommands } = historyManager.getStats()
        console.log(`Command History (${totalCommands} total, ${uniqueCommands} unique):`)
        const history = historyManager.getHistory()
        if (history.length === 0) {
          console.log('  No commands in history yet')
        } else {
          history.slice(0, 10).forEach((cmd, i) => console.log(`  ${i + 1}. ${cmd}`))
          if (history.length > 10) console.log(`  ... and ${history.length - 10} more`)
        }
        return ''
      },
      clear: () => {
        // Clear REPL history (which is the main history)
        if (replInstance && replInstance.history) {
          replInstance.history = []
        }

        // Clear our cache and reload from REPL
        historyManager.clearHistory()

        return 'Command history cleared!'
      }
    }
  },
  openkeyCommands,
  {
    uid: args => uid({ redis, ...args })
  }
)

replInstance = createSmartRepl({ commands, historyManager })
