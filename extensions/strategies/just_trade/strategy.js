var z = require('zero-fill')
  , n = require('numbro')

// Just Trade
// Trade as fast as you can with a percentage above or below current price
// Be sure to set
module.exports = function container(get, set, clear) {
  return {
    name: 'just_trade',
    description: '',

    getOptions: function () {
      this.option('period', 'period length, same as --periodLength', String, '30s')
      this.option('min_periods', '# of preroll periods. Not used so less than 1 but more than 0', Number, 0.01)
      this.option('start_with_assets', 'If you have assets to start with', Boolean, false)
    },

    calculate: function (s) {
      if (typeof s.just_trade_start_price === 'undefined') {
        s.just_trade_start_price = 0
      }
      if (typeof s.just_trade_highest === 'undefined') {
        s.just_trade_highest = s.period.high
      }
      if (typeof s.just_trade_lowest === 'undefined') {
        s.just_trade_lowest = s.period.low
      }

      if (s.period.high > s.just_trade_highest) {
        s.just_trade_highest = s.period.high
      }

      if (s.just_trade_lowest > s.period.low) {
        s.just_trade_lowest = s.period.low
      }

      s.just_trade_last_price = s.period.close

      s.signal = null

    },

    onPeriod: function (s, cb) {
      // sell logic
      if (s.action !== 'buying' && s.action !== 'selling') {
        if ((s.just_trade_last_action !== 'sell' && s.action == 'bought') || s.just_trade_last_action === null) {
          s.signal = 'sell'
          s.just_trade_last_action = 'sell'
          s.just_trade_start_price = s.just_trade_last_price
          s.options.order_type = 'maker'
          return cb()
        } else {
          if ((s.just_trade_last_action !== 'buy') || s.just_trade_last_action === null) {
            s.signal = 'buy'
            s.just_trade_last_action = 'buy'
            s.just_trade_start_price = s.just_trade_last_price
            s.options.order_type = 'taker'
            return cb()
          }
        }
      }

      // buy logic
      if (s.signal === null) {
        if (s.just_trade_last_action === null) {
          s.signal = 'sell'
          s.just_trade_last_action = 'sell'
          s.just_trade_start_price = s.just_trade_last_price
          s.options.order_type = 'maker'
        } else {
          s.signal = s.just_trade_last_action
        }
      }
      return cb()
    },

    onReport: function (s) {
      var cols = []
      var color = 'grey'
      if (s.just_trade_last_price > s.just_trade_start_price) {
        color = 'green'
      }
      else if (s.just_trade_last_price < s.just_trade_start_price) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.high).format('0.00000'), ' ')[color])
      cols.push(z(8, n(s.just_trade_start_price).format('0.00000'), ' ').grey)
      return cols
    }
  }
}
