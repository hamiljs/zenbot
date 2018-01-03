module.exports = {
  _ns: 'zenbot',

  'strategies.tiwycgi': require('./strategy'),
  'strategies.list[]': '#strategies.tiwycgi'
}
