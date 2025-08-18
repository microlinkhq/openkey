'use strict'

const createRepl = require('repl')
const path = require('path')
const os = require('os')
const mri = require('mri')
const { red } = require('./style')

const split = str => {
  const result = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        result.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) result.push(current)
  return result
}

const createSmartRepl = ({ commands, historyManager }) => {
  let currentSuggestion = ''
  let suggestionVisible = false

  // Session context for smarter suggestions
  let sessionCommands = []

  // Inline suggestions helper functions
  const clearSuggestion = () => {
    if (suggestionVisible) {
      suggestionVisible = false
      currentSuggestion = ''
    }
  }

  const replEval = async input => {
    const originalInput = input.slice(0, -1)
    const parsedInput = split(originalInput)
    let cmd = commands
    let index = 0
    const commandPath = []

    while (index < parsedInput.length && cmd[parsedInput[index]]) {
      commandPath.push(parsedInput[index])
      cmd = cmd[parsedInput[index]]
      index++
    }

    if (typeof cmd === 'function') {
      const { _, ...flags } = mri(parsedInput.slice(index))
      const result = await cmd(Object.keys(flags).length > 0 ? flags : parsedInput.slice(index))

      // Track successful commands in session context
      sessionCommands.unshift(originalInput)
      if (sessionCommands.length > 20) sessionCommands = sessionCommands.slice(0, 20)

      return result
    } else {
      const tree = require('./tree')
      const wrappedObj = { [commandPath[commandPath.length - 1]]: cmd }
      return tree(wrappedObj, '', commandPath.slice(0, -1).join('.'))
    }
  }

  const getCompletions = line => {
    const trimmedLine = line.trim()
    const lineParts = trimmedLine.split(' ')
    let currentCommands = commands
    let completions = []

    // Navigate command tree
    for (let i = 0; i < lineParts.length - 1; i++) {
      if (currentCommands[lineParts[i]]) {
        currentCommands = currentCommands[lineParts[i]]
      } else {
        return []
      }
    }

    // Get completions
    if (typeof currentCommands === 'object' && currentCommands !== null) {
      const lastPart = lineParts[lineParts.length - 1] || ''
      completions = Object.keys(currentCommands).filter(
        key => key.startsWith(lastPart) && typeof currentCommands[key] !== 'undefined'
      )

      if (lineParts.length > 1 && completions.length > 0) {
        const prefix = lineParts.slice(0, -1).join(' ') + ' '
        completions = completions.map(completion => prefix + completion)
      }
    }

    if (lineParts.length === 1 && completions.length === 0) {
      completions = Object.keys(commands).filter(cmd => cmd.startsWith(trimmedLine))
    }

    return completions
  }

  const smartCompleter = line => {
    // Priority 1: Complete visible suggestion
    if (suggestionVisible && currentSuggestion) {
      const completed = line + currentSuggestion
      clearSuggestion()
      return [[completed], line]
    }

    // Priority 2: Session context matches (same logic as showSuggestion)
    let bestMatch = null
    for (const sessionCmd of sessionCommands) {
      if (sessionCmd.startsWith(line) && sessionCmd !== line) {
        bestMatch = sessionCmd
        break
      }
    }

    // Priority 3: Regular history matches
    if (!bestMatch) {
      bestMatch = historyManager.findBestMatch(line.trim())
    }

    if (bestMatch && bestMatch !== line) {
      const baseCompletions = getCompletions(line)
      const otherCompletions = baseCompletions.filter(comp => comp !== bestMatch)
      return [[bestMatch, ...otherCompletions], line]
    }

    const historyMatches = historyManager.findMatchingCommands(line.trim())
    if (historyMatches.length > 1) {
      return [historyMatches, line]
    }

    // Priority 3: Command prefixes from history
    const trimmed = line.trim()
    if (trimmed.length > 0) {
      const argSuggestions = historyManager
        .getCommandPrefixes()
        .filter(prefix => prefix.toLowerCase().startsWith(trimmed.toLowerCase()))
        .slice(0, 5)

      if (argSuggestions.length > 0) {
        return [[...argSuggestions, ...getCompletions(line)], line]
      }
    }

    // Priority 4: Base completions
    const completions = getCompletions(line)
    return [completions.length ? completions : Object.keys(commands), line]
  }

  const repl = createRepl.start({
    prompt: '\x1b[1mopenkey\x1b[0m> ',
    eval: (input, context, filename, callback) => {
      replEval(input)
        .then(result => {
          if (result) console.log(result)
        })
        .catch(error => console.error(red(error.message)))
        .finally(callback)
    },
    completer: smartCompleter
  })

  repl.removeAllListeners('SIGINT')

  // Inline suggestions with session context awareness
  const showSuggestion = line => {
    if (!line || line === '') {
      if (suggestionVisible) {
        repl.output.write('\x1b[K')
        clearSuggestion()
      }
      return
    }

    // Don't trim - work with the exact line to preserve spaces
    let bestMatch = null

    // Priority 1: Recent session commands (smarter context)
    for (const sessionCmd of sessionCommands) {
      if (sessionCmd.startsWith(line) && sessionCmd !== line) {
        bestMatch = sessionCmd
        break
      }
    }

    // Priority 2: Fall back to regular history if no session match
    if (!bestMatch) {
      bestMatch = historyManager.findBestMatch(line)
    }

    if (bestMatch && bestMatch !== line) {
      const suggestion = bestMatch.slice(line.length)
      if (suggestion && suggestion !== currentSuggestion) {
        if (suggestionVisible) {
          repl.output.write('\x1b[K')
        }
        repl.output.write('\x1b[90m' + suggestion + '\x1b[0m')
        if (suggestion.length > 0) {
          repl.output.write('\x1b[' + suggestion.length + 'D')
        }
        currentSuggestion = suggestion
        suggestionVisible = true
      }
    } else if (suggestionVisible) {
      repl.output.write('\x1b[K')
      clearSuggestion()
    }
  }

  repl.on('line', () => {
    if (suggestionVisible) {
      repl.output.write('\x1b[K')
      clearSuggestion()
    }
  })

  process.stdin.on('keypress', (str, key) => {
    if (!key) return

    // Handle Ctrl+C - immediate exit
    if (key.ctrl && key.name === 'c') {
      process.exit(0)
    }

    // Right arrow accepts suggestion
    if (key.name === 'right' && suggestionVisible && currentSuggestion && repl.cursor === repl.line.length) {
      repl.output.write('\x1b[K')
      repl.line = repl.line + currentSuggestion
      repl.cursor = repl.line.length
      clearSuggestion()
      repl._refreshLine()
      return
    }

    // Clear suggestions on navigation keys
    if (['up', 'down', 'left', 'enter', 'return'].includes(key.name)) {
      if (suggestionVisible) {
        repl.output.write('\x1b[K')
        clearSuggestion()
      }
    } else if (['backspace', 'delete'].includes(key.name)) {
      if (suggestionVisible) {
        repl.output.write('\x1b[K')
        clearSuggestion()
      }
      // Show new suggestion after backspace/delete
      setTimeout(() => {
        if (repl.line) showSuggestion(repl.line)
      }, 0)
    } else if (str && str.length === 1 && str >= ' ') {
      // Show suggestion after typing normal characters
      setTimeout(() => {
        if (repl.line) showSuggestion(repl.line)
      }, 0)
    }
  })

  // Enable keypress events (but keep REPL's normal Ctrl+C handling)
  if (typeof require('readline').emitKeypressEvents === 'function') {
    require('readline').emitKeypressEvents(process.stdin)
  }

  repl.setupHistory(path.join(os.homedir(), '.openkey_repl_history'), () => {})
  Object.getOwnPropertyNames(repl.context).forEach(mod => delete repl.context[mod])

  return repl
}

module.exports = { createSmartRepl }
