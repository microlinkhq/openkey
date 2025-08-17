const { styleText } = require('util')

const gray = text => styleText('gray', text)
const white = text => styleText('white', text)
const red = text => styleText('red', text)

module.exports = {
  gray,
  white,
  red
}
