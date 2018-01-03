module.exports = {
  _ns: 'zenbot',

  'strategies.just_trade': require('./strategy'),
  'strategies.list[]': '#strategies.just_trade'
}
