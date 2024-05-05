/* global codecopy */

window.$docsify = {
  repo: 'microlinkhq/openkey',
  maxLevel: 4,
  executeScript: true,
  auto2top: true,
  noEmoji: true,
  plugins: [
    function (hook) {
      hook.ready(function () {
        codecopy('pre')
      })
    }
  ]
}
