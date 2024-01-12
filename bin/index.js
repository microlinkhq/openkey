#!/usr/bin/env node
'use strict'

const mri = require('mri')

const { _, ...flags } = mri(process.argv.slice(2), {
  /* https://github.com/lukeed/mri#usage< */
  default: {
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  }
})

if (flags.help) {
  console.log(require('fs').readFileSync('./help.txt', 'utf8'))
  process.exit(0)
}

Promise.resolve(require('openkey')(flags))
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
