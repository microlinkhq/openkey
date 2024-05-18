const { errors } = require('./error')

module.exports = (condition, code, args = () => []) => {
  return (
    condition ||
    (() => {
      throw errors[code](args)
    })()
  )
}
