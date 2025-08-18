'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')

const createCommandHistoryManager = (options = {}) => {
  const HISTORY_FILE = options.historyFile || path.join(os.homedir(), '.openkey_repl_history')
  const MAX_HISTORY_SIZE = options.maxHistorySize || 1000
  let commandHistory = []

  const loadHistory = () => {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        // Read as plain text lines (same format as REPL uses)
        commandHistory = fs
          .readFileSync(HISTORY_FILE, 'utf8')
          .split('\n')
          .filter(line => line.trim())
          .reverse() // REPL saves newest last, we want newest first
      }
    } catch (error) {
      commandHistory = []
    }
  }

  const addCommand = command => {
    // Commands are automatically saved by REPL, just update our in-memory cache
    if (!command.trim() || commandHistory[0] === command.trim()) return
    commandHistory.unshift(command.trim())
    if (commandHistory.length > MAX_HISTORY_SIZE) {
      commandHistory = commandHistory.slice(0, MAX_HISTORY_SIZE)
    }
  }

  const findMatchingCommands = input => {
    if (!input.trim()) return []
    const inputLower = input.toLowerCase()
    return commandHistory.filter(cmd => cmd.toLowerCase().startsWith(inputLower)).slice(0, 10)
  }

  const findBestMatch = input => {
    if (!input.trim()) return null
    const inputLower = input.toLowerCase()
    const matches = commandHistory.filter(cmd => cmd.toLowerCase().startsWith(inputLower))
    return matches.length > 0 ? matches[0] : null
  }

  const getCommandPrefixes = () => {
    const prefixes = new Set()
    commandHistory.forEach(cmd => {
      const parts = cmd.split(' ')
      for (let i = 1; i <= Math.min(parts.length, 3); i++) {
        prefixes.add(parts.slice(0, i).join(' '))
      }
    })
    return Array.from(prefixes)
  }

  loadHistory()

  return {
    addCommand,
    findMatchingCommands,
    findBestMatch,
    getCommandPrefixes,
    getHistory: () => [...commandHistory],
    clearHistory: () => {
      commandHistory = []
      try {
        fs.writeFileSync(HISTORY_FILE, '')
      } catch (error) {
        // Silent fail
      }
    },
    getStats: () => ({
      totalCommands: commandHistory.length,
      uniqueCommands: new Set(commandHistory).size
    })
  }
}

module.exports = { createCommandHistoryManager }
