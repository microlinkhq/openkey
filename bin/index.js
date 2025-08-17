'use strict'

const openkey = require('openkey')
const createRepl = require('repl')
const Redis = require('ioredis')
const path = require('path')
const mri = require('mri')
const os = require('os')

const { gray, white, red } = require('./style')

const redis = new Redis()

const commands = Object.assign(
  {
    version: () => require('../package.json').version,
    exit: () => process.exit()
  },
  openkey({ redis })
)

const replEval = async input => {
  const [command, subcommand, ...args] = input.slice(0, -1).split(' ')
  const { _, ...opts } = mri(args)
  const cmd = commands[command]

  if (cmd) {
    if (subcommand) {
      return cmd[subcommand](opts)
    } else if (typeof cmd === 'function') {
      return cmd(opts)
    } else if (typeof cmd === 'object' && cmd !== null) {
      const tree = require('./tree')
      const partialObj = { [command]: cmd }
      return tree(partialObj)
    }
  } else if (command === 'help' || command === '') {
    return require('./tree')(commands)
  } else {
    return `${gray('Type')} ${white('help')} ${gray('to see all commands.')}`
  }
}

const completer = line => {
  const completions = Object.keys(commands)
  const lineParts = line.split(' ')
  const hits = completions.filter(c => c.startsWith(lineParts[lineParts.length - 1]))
  return [hits.length ? hits : completions, line]
}

const repl = createRepl.start({
  prompt: '\x1b[1mopenkey\x1b[0m> ',
  eval: (input, context, filename, callback) => {
    replEval(input, context, filename)
      .then(result => {
        if (result) console.log(result)
      })
      .catch(error => {
        console.error(red(error.message))
      })
      .finally(callback)
  },
  completer
})

repl.setupHistory(path.join(os.homedir(), '.openkey_repl_history'), () => {})
Object.getOwnPropertyNames(repl.context).forEach(mod => delete repl.context[mod])
