#!/usr/bin/env node
'use strict'

const path = require('path')
const pkg = require('../package.json')
const JoyCon = require('joycon')
const mri = require('mri')

require('update-notifier')({ pkg }).notify()

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

const joycon = new JoyCon({
  cwd,
  packageKey: pkg.name,
  files: [
    'package.json',
    `.${pkg.name}rc`,
    `.${pkg.name}rc.json`,
    `.${pkg.name}rc.js`,
    `${pkg.name}.config.js`
  ]
})

const { data: config = {} } = (await joycon.load()) || {}

Promise.resolve(
  require('openkey')({
    ...config,
    ...flags
  })
)
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
