'use strict'

const openkey = require('openkey')
const createRepl = require('repl')
const Redis = require('ioredis')
const path = require('path')
const os = require('os')

const { red } = require('./style')

const redis = new Redis()

const commands = Object.assign(
  {
    version: () => require('../package.json').version,
    exit: () => process.exit(),
    help: () => require('./tree')(commands)
  },
  openkey({ redis })
)

const replEval = async input => {
  const parsedInput = require('./split')(input.slice(0, -1))
  let cmd = commands
  let index = 0
  const commandPath = []

  while (index < parsedInput.length && cmd[parsedInput[index]]) {
    commandPath.push(parsedInput[index])
    cmd = cmd[parsedInput[index]]
    index++
  }

  if (typeof cmd === 'function') {
    return cmd(parsedInput.slice(index))
  } else {
    const tree = require('./tree')
    const wrappedObj = { [commandPath[commandPath.length - 1]]: cmd }
    return tree(wrappedObj, '', commandPath.slice(0, -1).join('.'))
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
      .then(async result => {
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
