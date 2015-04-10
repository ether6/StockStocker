angular.module("stockWatch")
.factory('stockComputer', function ($http) {
	
	var Trade = function(trade, access_token) {
		this.data = trade
		this.access_token = access_token
		this.trade_date = new Date(this.data.timestamp_start_EDT)
		// yahoo data is in 10 digit form (vs 13 digit)
		this.data.timestamp_start = Math.round(this.data.timestamp_start_EDT / 1000)
		this.update()
	}

	Trade.prototype.dateToString = function() {
		this.trade_date = new Date(this.data.time_start)
		return String(this.trade_date.getFullYear()) + String(this.trade_date.getMonth()) + String(this.trade_date.getDate())	
	}

	// Trade.prototype.clearDayOne = function() {
	// 	// iterate through trade.y_data and exit trade based on limit or stop where applicable
	// 	this.checkLimitAndStop()
	// }

	Trade.prototype.setInitial = function() {
		for(var i = 1; i < this.y_data.series.length; i++)
			if(this.y_data.series[i].Timestamp > this.data.timestamp_start && this.y_data.series[i-1].Timestamp < this.data.timestamp_start_EDT) {
				this.data.initial = this.y_data.series[i-1].close
				return
			}
		if(!this.data.initial)
			this.data.initial = this.y_data.series[0].close
	}

	Trade.prototype.setCurrent = function() {
		this.data.current = this.y_data.series[this.y_data.series.length - 1].close
	}

	Trade.prototype.calculateProfit = function() {
		if(this.data.open)
			this.setCurrent()
		var invert = this.data.position == 'long' ? 1: -1
		this.data.profit = Number(((this.data.current - this.data.initial) * this.data.num_shares).toFixed(2)) * invert
	}

	Trade.prototype.checkLimitAndStop = function(clear_day_one) {
		clear_day_one = clear_day_one || false
		if(this.data.position == 'long') {
			for(var i = 0; i < this.y_data.series.length; i++)
				if(this.y_data.series[i].Timestamp > this.data.timestamp_start) {
					if(this.y_data.series[i]['high'] >= this.data.limit) {
						this.data.current = this.data.limit
						this.data.open = false
						this.setTradeEnd(this.y_data.series[i].Timestamp)
					} else if(this.y_data.series[i]['low'] <= this.data.stop) {
						this.data.current = this.data.stop
						this.data.open = false
						this.setTradeEnd(this.y_data.series[i].Timestamp)
					}
				}
		} else {
			for(var i = 0; i < this.y_data.series.length; i++)
				if(this.y_data.series[i].Timestamp > this.data.timestamp_start) {
					if(this.y_data.series[i]['high'] >= this.data.stop) {
						this.data.current = this.data.stop
						this.data.open = false
						this.setTradeEnd(this.y_data.series[i].Timestamp)
					} else if(this.y_data.series[i]['low'] <= this.data.limit) {
						this.data.current = this.data.limit
						this.data.open = false
						this.setTradeEnd(this.y_data.series[i].Timestamp)
					}
				}
		}
	}

	Trade.prototype.setTradeEnd = function(timestamp) {
		this.data.time_end = new Date(timestamp)
	}

	Trade.prototype.update = function() {
		var date_as_string = String(_today.getFullYear()) + String(_today.getMonth()) + String(_today.getDate())
		if(this.data.open) {
			if(date_as_string == this.dateToString()) {
				// need interday data
				var range = '1d'
				var target = 'http://chartapi.finance.yahoo.com/instrument/1.1/' + this.data.symbol + '/chartdata;type=quote;range=' + range + '/json'
			} else {
				// need daily data 
				var range = Math.ceil((_today - this.trade_date) / 86400000 + 1) + 'd'
				var target = 'http://chartapi.finance.yahoo.com/instrument/1.1/' + this.data.symbol + '/chartdata;type=quote;range=' + range + '/json'
			}
			var self = this
			$http.get('/api/user/trade?access_token=' + this.access_token + '&target=' + target).success(function(data, status, headers, config) {
				self.y_data = JSON.parse(data)
				console.log(self)
				if(!self.initial) {
					self.setInitial()
				}
				if(!self.day_one_cleared && range != '1d') {
					self.checkLimitAndStop(clear_day_one = true)
				}
				self.calculateProfit()
			}).error(function(data, status, headers, config) {
				console.log(data, status, headers, config)
			})
		}
	}

	return Trade
})
