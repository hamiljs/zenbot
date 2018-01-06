var z = require('zero-fill')
  , n = require('numbro')

// Take It While You Can Get It
// Basic Idea is that you buy when price drops below your threshold and then has a defined upturn
// then it sells when it gets above our sell threshold and then has a defined downturn.
// If the price rises after your sell, the start price will adjust to the new floor
// If you set an escape threshold then it will dump the assets to save what it can.
// Buy and Sell % should be at 99
module.exports = function container(get, set, clear) {
  return {
    name: 'tiwycgi',
    description: 'Take it while you can get it',

    getOptions: function () {
      this.option('period', 'period length, same as --periodLength', String, '3m')
      this.option('min_periods', '# of preroll periods. Not used so less than 1 but more than 0', Number, 0)
      this.option('sell_min_pct', 'Do not act on anything unless the price is this percentage above the original price', Number, 5)
      this.option('sell_trigger', 'sell when the top drops at least below this percentage', Number, 3)
      this.option('buy_min_pct', 'Do not act on anything unless the price is this percentage below the original price', Number, 2)
      this.option('buy_trigger', 'Buy when the bottom increased at least above this percentage', Number, 1)
      this.option('start_price', 'Starting asset price', Number, 0)
      this.option('panic_buy', 'buy when the top jumps higher than this max, regardless of buy_min (panic buy, 0 to disable)', Number, 6)
      this.option('panic_sell', 'sell when the top drops lower than this max, regardless of sell_min (panic sell, 0 to disable)', Number, 4)
    },

    calculate: function (s) {
      if (typeof s.tiwycgi_start_price === 'undefined') {
        s.tiwycgi_start_price = s.options.start_price
        s.tiwycgi_start = s.tiwycgi_start_price
      }

      if (typeof s.tiwycgi_panic_sell === 'undefined') {
        s.tiwycgi_panic_sell = s.options.panic_sell
      }
      if (typeof s.tiwycgi_panic_buy === 'undefined') {
        s.tiwycgi_panic_buy = s.options.panic_buy
      }

      if (typeof s.tiwycgi_sell_trigger === 'undefined') {
        s.tiwycgi_sell_trigger = s.options.sell_trigger
      }
      if (typeof s.tiwycgi_buy_trigger === 'undefined') {
        s.tiwycgi_buy_trigger = s.options.buy_trigger
      }

      if (typeof s.tiwycgi_sell_min === 'undefined') {
        s.tiwycgi_sell_min = s.options.sell_min_pct
      }
      if (typeof s.tiwycgi_buy_min === 'undefined') {
        s.tiwycgi_buy_min = s.options.buy_min_pct
      }

      if (s.tiwycgi_start_price>0) {
        s.tiwycgi_moving_target = false
        s.tiwycgi_has_assets = true
        s.tiwycgi_last_action = 'buy'
      } else {
        s.tiwycgi_moving_target = true
        s.tiwycgi_has_assets = false
      }

      if (typeof s.tiwycgi_previous_price === 'undefined') {
        s.tiwycgi_previous_price = s.period.close
      }
      if (typeof s.tiwycgi_last_action === 'undefined') {
        s.tiwycgi_last_action = null
      }

      if (typeof s.tiwycgi_highest === 'undefined') {
        s.tiwycgi_highest = s.period.high
      }
      if (typeof s.tiwycgi_lowest === 'undefined') {
        s.tiwycgi_lowest = s.period.low
      }

      if (s.period.high > s.tiwycgi_highest) {
        s.tiwycgi_highest = s.period.high
      }
      if (s.tiwycgi_lowest > s.period.low) {
        s.tiwycgi_lowest = s.period.low
      }

      s.tiwycgi_previous_price = s.tiwycgi_last_price
      s.tiwycgi_last_price = s.period.close
      s.signal = null

    },

    onPeriod: function (s, cb) {
      if (!s.in_preroll) {
        //Panic Buy
        if (s.tiwycgi_panic_buy > 0) {
          if (s.tiwycgi_has_assets === false) {
            if ((s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.tiwycgi_panic_buy / 100))) < s.tiwycgi_last_price) {
              console.log('Panic Buy: '+String(s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.tiwycgi_panic_buy / 100)))+' < '+String(s.tiwycgi_last_price))
              s.signal = 'buy_stop'
              s.tiwycgi_last_action = 'buy'
              s.tiwycgi_start_price = s.tiwycgi_last_price
              s.tiwycgi_start = s.tiwycgi_start_price
              s.tiwycgi_moving_target = false
              s.tiwycgi_has_assets = true
              return cb()
            }
          }
        }
        // Panic Sell
        if (s.tiwycgi_panic_sell > 0) {
          if (s.tiwycgi_has_assets === true) {
            if (s.tiwycgi_last_price < (s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.tiwycgi_panic_sell / 100)))) {
              console.log('Panic Sell: '+String(s.tiwycgi_last_price) +' < ' + String((s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.tiwycgi_panic_sell / 100)))))
              s.signal = 'sell_stop'
              s.tiwycgi_last_action = 'sell'
              s.tiwycgi_start_price = s.tiwycgi_last_price
              s.tiwycgi_start = s.tiwycgi_start_price
              s.tiwycgi_moving_target = true
              s.tiwycgi_has_assets = false
              return cb()
            }
          }
        }
        // sell logic
        if (s.tiwycgi_last_action !== 'sell') {
          if (s.tiwycgi_last_price >= (s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.tiwycgi_sell_min / 100)))) {
            console.log('Sell threshold reached:' + String(s.tiwycgi_last_price) + ' >= ' + String((s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.tiwycgi_sell_min / 100)))))
            if (s.tiwycgi_last_price < (s.tiwycgi_highest - (s.tiwycgi_highest * (s.tiwycgi_sell_trigger / 100)))) {
              console.log('Sell trigger: ' + String(s.tiwycgi_last_price) + ' < ' + String((s.tiwycgi_highest - (s.tiwycgi_highest * (s.tiwycgi_sell_trigger / 100)))))
              s.signal = 'sell'
              s.tiwycgi_last_action = 'sell'
              s.tiwycgi_start_price = s.tiwycgi_last_price
              s.tiwycgi_start = s.tiwycgi_start_price
              s.tiwycgi_moving_target = true
              s.tiwycgi_has_assets = false
              return cb()
            }
          }
        }
        // buy logic
        if (s.tiwycgi_last_action !== 'buy') {
          if (s.tiwycgi_last_price < (s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.tiwycgi_buy_min / 100)))) {
            console.log('Buy threshold reached: ' + String(s.tiwycgi_last_price) + ' < ' + String((s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.tiwycgi_buy_min / 100)))))
            if (s.tiwycgi_last_price > (s.tiwycgi_lowest + (s.tiwycgi_lowest * (s.tiwycgi_buy_trigger / 100)))) {
              console.log('Buy trigger: '+String(s.tiwycgi_last_price)+' > '+String((s.tiwycgi_lowest + (s.tiwycgi_lowest * (s.tiwycgi_buy_trigger / 100)))))
              s.signal = 'buy'
              s.tiwycgi_last_action = 'buy'
              if (s.tiwycgi_has_assets === false) {
                s.tiwycgi_start_price = s.tiwycgi_last_price
                s.tiwycgi_start = s.tiwycgi_start_price
              }
              s.tiwycgi_moving_target = false
              s.tiwycgi_has_assets = true
              return cb()
            }
          }
        }
      }
      return cb()
    },

    onReport: function (s) {
      var cols = []
      var color = 'grey'
      if (s.tiwycgi_last_price > s.tiwycgi_start_price) {
        color = 'green'
      }
      else if (s.tiwycgi_last_price < s.tiwycgi_start_price) {
        color = 'red'
      }
      cols.push(z(8, n(s.tiwycgi_highest).format('0.00000'), ' ')[color])
      cols.push(z(8, n(s.tiwycgi_start_price).format('0.00000'), ' ').grey)
      return cols
    }
  }
}
