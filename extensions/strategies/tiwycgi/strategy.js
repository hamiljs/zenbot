var z = require('zero-fill')
  , n = require('numbro')

// Take It While You Can Get It
// Basic Idea is that you buy when price drops below your threshold and then has a defined upturn
// then it sells when it gets above our sell threshold and then has a defined downturn.
// If the price rises after your sell, the start price will adjust to the new floor
// If you set an escape threshold then it will dump the assets to save what it can.
// Buy and Sell % should be at 99
module.exports = function container (get, set, clear) {
  return {
    name: 'tiwycgi',
    description: '',

    getOptions: function () {
      this.option('period', 'period length, same as --periodLength', String, '5m')
      this.option('min_periods', '# of preroll periods. Not used so less than 1 but more than 0', Number, 0.01)

      this.option('sell_min', 'Do not act on anything unless the price is this percentage above the original price', Number, 4.0)
      this.option('sell_trigger', 'sell when the top drops at least below this percentage', Number, 1.0)

      this.option('buy_min', 'Do not act on anything unless the price is this percentage below the original price', Number, 2.0)
      this.option('buy_trigger', 'Buy when the bottom increased at least above this percentage', Number, 1.0)

      this.option('start_price', 'Starting asset price', Number, 0)
      this.option('start_with_assets', 'If you have assets to start with', Boolean, false)

      this.option('escape_threshold', 'sell when the top drops lower than this max, regardless of sell_min (panic sell, 0 to disable)', Number, 0)
    },

    calculate: function (s) {
      if (typeof s.tiwycgi_start_price === 'undefined') {
        s.tiwycgi_start_price = s.options.start_price
        if (s.tiwycgi_start_price > 0){
          s.tiwycgi_start = s.tiwycgi_start_price
          s.tiwycgi_last_price = s.tiwycgi_start_price
        }
      } else {
        if (typeof s.tiwycgi_last_price === 'undefined') {
          s.tiwycgi_last_price = s.period.close
        }
        if (typeof s.tiwycgi_start === 'undefined') {
          s.tiwycgi_start = s.tiwycgi_last_price
        }
      }

      if (typeof s.tiwycgi_stage === 'undefined'){
        s.tiwycgi_stage=1
      }

      if (typeof s.tiwycgi_escape_threshold === 'undefined') {
        s.tiwycgi_escape_threshold = s.options.escape_threshold
      }

      if (typeof s.tiwycgi_moving_target === 'undefined') {
        if (s.options.start_with_assets === true) {
          s.tiwycgi_moving_target = false
          s.tiwycgi_has_assets = true
        } else {
          // s.tiwycgi_moving_target = true
          s.tiwycgi_has_assets = false
        }
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
        s.tiwycgi_lowest = s.period.high
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

      if (s.tiwycgi_moving_target === true) {
        if ((s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.options.sell_min / 100))) < s.period.close) {
          s.tiwycgi_start_price = s.period.close
        }
      }

    },

    onPeriod: function (s, cb) {
      // sell logic
      if (s.tiwycgi_last_action !== 'sell') {
        // console.log('Stage: '+s.tiwycgi_stage+' - last price: '+s.tiwycgi_last_price+' - target: '+(s.tiwycgi_highest - (s.tiwycgi_highest * (s.options.sell_trigger / 100)))+'\n')
        if (s.tiwycgi_stage === 2) {
          // console.log('made it here')
          if (s.tiwycgi_last_price < (s.tiwycgi_highest - (s.tiwycgi_highest * (s.options.sell_trigger / 100)))) {
            // console.log('Stage 2 sell')
            s.signal = 'sell'
            s.tiwycgi_last_action = 'sell'
            s.tiwycgi_start_price = s.tiwycgi_last_price
            s.tiwycgi_start = s.tiwycgi_start_price
            s.tiwycgi_moving_target = true
            s.tiwycgi_has_assets = false
            s.tiwycgi_stage = 1
            return cb()
          }
        } else {
          if (s.tiwycgi_stage === 1) {
            if (s.tiwycgi_last_price >= (s.tiwycgi_start_price + (s.tiwycgi_start_price * (s.options.sell_min / 100)))) {
              // console.log('Stage 1 sell' )
              s.tiwycgi_stage=2
            }
          }
        }
      }

      // buy logic
      if (s.tiwycgi_last_action !== 'buy') {
        if (s.tiwycgi_stage === 2) {
          if (s.tiwycgi_last_price > (s.tiwycgi_lowest + (s.tiwycgi_lowest * (s.options.buy_trigger / 100)))) {
            // console.log('Stage 2 buy')
            s.signal = 'buy'
            s.tiwycgi_last_action = 'buy'
            s.tiwycgi_start_price = s.tiwycgi_last_price
            s.tiwycgi_start = s.tiwycgi_start_price
            s.tiwycgi_moving_target = false
            s.tiwycgi_has_assets = true
            s.tiwycgi_stage = 1
            return cb()
          }
        } else {
            if (s.tiwycgi_stage === 1) {
              if (s.tiwycgi_last_price <= (s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.options.buy_min / 100)))) {
                // console.log('Stage 1 buy')
                s.tiwycgi_stage = 2
              }
            }
        }
      }

      // Run for cover
    if (s.tiwycgi_escape_threshold > 0 ) {
      if (s.tiwycgi_last_price < (s.tiwycgi_start_price - (s.tiwycgi_start_price * (s.tiwycgi_escape_threshold / 100)))) {
        s.signal = 'sell'
        s.tiwycgi_last_action = 'sell'
        s.tiwycgi_start_price=s.tiwycgi_last_price
        s.tiwycgi_start=s.tiwycgi_start_price
        s.tiwycgi_moving_target=true
        s.tiwycgi_has_assets=false
        return cb()
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
