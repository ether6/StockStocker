var stockWatch = angular.module("stockWatch", ['ngRoute', 'pageslide-directive'])
var _today = new Date()
var _local_offset = _today.getTimezoneOffset()
console.log(_local_offset)
// stockWatch.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
// 	$routeProvider.when("/login", {
// 		templateUrl: 'views/logIn.html'
// 	})
// }])

stockWatch.service('getData', ['$http', '$resource', function($http, $resource) {
    // The complete url is from https://developer.yahoo.com/yql/.
    this.getStockQuote = function(ticker) {
        var url = 'http://query.yahooapis.com/v1/public/yql'
        var data = encodeURIComponent(
            "select * from yahoo.finance.quotes where symbol in ('" + ticker + "')")
        url += '?q=' + data + '&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'
        return $resource(url)
    }
}])

stockWatch.service('sharedProperties', function () {
	var shared = {
		token: '',
		epoch: '',
		epochs: {},
	}

	return {
		getProperty: function (key) {
			return shared[key]
		},
		setProperty: function(key, value) {
			shared[key] = value
		}
	}
})

stockWatch.config(function($routeProvider, $locationProvider) {
	$routeProvider
		.when("/", {
			templateUrl: 'static/views/list-epochs.html'
		})
		.when("/log-in", {
			templateUrl: 'static/views/log-in.html',
		})
		.when("/new-account", {
			templateUrl: 'static/views/new-account.html'
		})
		.when("/new-epoch", {
			templateUrl: 'static/views/new-epoch.html'
		})
		.when("/new-trade", {
			templateUrl: 'static/views/new-trade.html'
		})
		.when("/list-epochs", {
			templateUrl: 'static/views/list-epochs.html'
		})
		.when("/epoch/:epochId", {
			templateUrl: 'static/views/list-trades.html',
		    controller: 'epochCtrl'
		})
		.when("/password-forgot", {
			templateUrl: 'static/views/password-forgot.html'
		})
		.when("/password-code", {
			templateUrl: 'static/views/password-code.html'
		})
		.when("/password-reset", {
			templateUrl: 'static/views/password-reset.html'
		})
		.otherwise("/list-epochs", {
			templateUrl: 'static/views/list-epochs.html'
		})

	// configure html5 to get links working on jsfiddle
	$locationProvider.html5Mode(true)
})

stockWatch.factory('stockComputer', function ($http) {
	
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


stockWatch.controller('epochCtrl', function($scope, $http, $route, $routeParams, $location, sharedProperties, stockComputer) {

	$scope.token = sharedProperties.getProperty('token')
	$scope.epoch_id = $routeParams.epochId
	getTrades()

	$scope.$watch('epoch.trades', function () {
		updateEpochPL();
	}, true);

  	function getStockQuoteURL(ticker) {
        var data = "http://chartapi.finance.yahoo.com/instrument/1.1/vti/chartdata;type=quote;range=14d/json?callback=profit"
        return data
    }

    function getTrades() {
		$scope.epoch = {}
		$http.get('/api/user/epoch?access_token=' + $scope.token + '&epoch_id=' + $scope.epoch_id)
			.success(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
				$scope.epoch = data.epoch
				updateTrades()
				console.log($scope.epoch.trades)
			}).error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	function updateTrades() {
	    for(var i = 0; i < $scope.epoch.trades.length; i++) {
			var trade = new stockComputer($scope.epoch.trades[i], $scope.token)
			console.log(trade)
			$scope.epoch.trades[i] = trade.data
	    }
	}

	function updateEpochPL() {
	    console.log($scope.epoch.trades)
	    if(typeof $scope.epoch.trades != 'undefined') {
		    $scope.epoch.gain = 0
		    $scope.epoch.loss = 0
		    for(var i = 0; i < $scope.epoch.trades.length; i++) {
				$scope.epoch.gain += $scope.epoch.trades[i].profit > 0 ? $scope.epoch.trades[i].profit: 0
				$scope.epoch.loss -= $scope.epoch.trades[i].profit < 0 ? $scope.epoch.trades[i].profit: 0
		    }
		    $scope.epoch.gain = Math.round($scope.epoch.gain)
		    $scope.epoch.loss = Math.round($scope.epoch.loss)
		    var epoch_properties = {}
		    epoch_properties[$scope.epoch_id] = {
		    	gain: Math.round($scope.epoch.gain),
		    	loss: Math.round($scope.epoch.loss)
		    }
		    sharedProperties.setProperty('epochs', epoch_properties)
		}
	}

	$scope.newTrade = function(new_trade) {
		if($scope.token) {
			$http.post('/api/user/trade', {trade: new_trade, epoch_id: $scope.epoch_id, access_token: $scope.token}).
				success(function(data, status, headers, config) {
					if(data.message)
						$scope.message = data.message
					$scope.epoch.trades.push(data.trade)
				}).
				error(function(data, status, headers, config) {
					if(data.message)
						$scope.message = data.message
				})
		} else {
			// redirect to login
		}
	}

	$scope.deleteTrade = function(trade_id) {
		$http.delete('/api/user/trade?access_token=' + $scope.token + '&trade_id=' + trade_id + '&epoch_id=' + $scope.epoch_id)
			.success(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
				$scope.epoch.trades = data.trades
			}).error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	$scope.open = function(trade){
		if ($scope.isOpen(trade)){
			$scope.opened = undefined
		} else {
			$scope.opened = trade
		}
	}

	$scope.isOpen = function(trade){
		return $scope.opened === trade
	}

	$scope.close = function() {
		$scope.opened = undefined
	}

	$scope.anyItemOpen = function() {
		return $scope.opened !== undefined
	}


})

stockWatch.controller('stockWatchCtrl', function($scope, $http, $route, $routeParams, $location, sharedProperties) {
	
	$scope.message = ''
	$scope.user = {}
	$scope.epochs = []
	$scope.create = {}
	$scope.login = {}
	$scope.forgot_pswd = {}
	$scope.reset_pswd = {}
    $scope.$route = $route
    $scope.$location = $location
    $scope.$routeParams = $routeParams
    $scope.loggedIn = false
    
	$scope.$watch(function() { return $location.path(); }, function(newValue, oldValue){  
	    if ($scope.loggedIn == false && !(
	    		newValue == '/log-in' ||
	    		newValue == '/password-forgot' ||
	    		newValue == '/password-code' ||
	    		newValue == '/new-account' )
	    ) {
	    	$location.path('/log-in') 
	    }
	    if(newValue == '/list-epochs')
	    	updateEpochPL()
	})

	function updateEpochPL() {
		var epochs = sharedProperties.getProperty('epochs')
		console.log(epochs)
		if($scope.epochs.length > 0) {
			for(var i = 0; i < $scope.epochs.length; i++) {
				console.log($scope.epochs[i]['_id'])
				if(typeof epochs[$scope.epochs[i]['_id']] != 'undefined') {
					$scope.epochs[i].gain = epochs[$scope.epochs[i]['_id']].gain
					$scope.epochs[i].loss = epochs[$scope.epochs[i]['_id']].loss
				}
			}
		}
	}

    $scope.$back = function() { 
		console.log($scope.epochs)
		window.history.back()
	}
    $scope.$logOut = function() { 
		sharedProperties.setProperty('token', '')
		if(typeof(Storage) !== "undefined") {
			localStorage.removeItem("token")
			localStorage.removeItem("expires")
		}
		$scope.loggedIn = false
		$location.path( "/log-in" )
	}

	if(typeof(Storage) !== "undefined") {
		$scope.token = localStorage.getItem("token")
		sharedProperties.setProperty('token', $scope.token)
		$scope.expires = localStorage.getItem("expires")
		console.log($scope.token)
		if($scope.token) {
			$http.get('/api/user?access_token=' + $scope.token + '&expires=' + $scope.expires).
				success(function(data, status, headers, config) {
					$scope.user = data.user.profile
					$scope.epochs = data.user.epochs
					$scope.loggedIn = true
					if(data.message)
						$scope.message = data.message
			        $location.path('/list-epochs') 
					// if(typeof data.token != undefined) {
					// 	$scope.token = data.token
					// 	$scope.expires = data.expires
					// }

				// }).
				// error(function(data, status, headers, config) {
				// 	console.log(data, status, headers, config)
				})
		} else
			$location.path( "/log-in" )
	}


	$scope.newEpoch = function(new_epoch) {
		if($scope.token) {
			$http.post('/api/user/epoch', {epoch: new_epoch, access_token: $scope.token}).
				success(function(data, status, headers, config) {
					if(data.message)
						$scope.message = data.message
					$scope.epochs = data.epochs
				}).
				error(function(data, status, headers, config) {
					if(data.message)
						$scope.message = data.message
					console.log(data, status, headers, config)
				})
				$location.path( "/list-epochs" )
		} else {
			$location.path( "/log-in" )
		}
	}

	$scope.deleteEpoch = function(epoch_id) {
		$http.delete('/api/user/epoch?access_token=' + $scope.token + '&epoch_id=' + epoch_id)
			.success(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
				$scope.epochs = data.epochs
			}).error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	//////////////////////////////////////////////////
	//////////////// USER CONTROLS ///////////////////
	//////////////////////////////////////////////////
	$scope.logIn = function() {
		$http.post('/api/authenticate', $scope.login).
			success(function(data, status, headers, config) {

				if(data.message)
					$scope.message = data.message

				$scope.user = data.user.profile
				$scope.epochs = data.epochs
				$scope.token = data.token
				$scope.expires = data.expires
				$scope.loggedIn = true
				sharedProperties.setProperty('token', $scope.token)

				if(typeof(Storage) !== "undefined") {
					if($scope.login.remember && data.token) {
						localStorage.setItem("token", data.token)
						localStorage.setItem("expires", data.expires)
					} else {
						localStorage.removeItem("token")
						localStorage.removeItem("expires")
					}
				}
				$location.path( "/list-epochs" )
			}).
			error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	$scope.forgotPswd = function() {
		$scope.reset_pswd.email = $scope.forgot_pswd.email
		$http.get('/api/user/password?email=' + $scope.forgot_pswd.email).
			success(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
				$location.path( "/password-code" )
			}).
			error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	$scope.resetPswd = function() {
		data = {
			email: $scope.reset_pswd.email,
			password: $scope.reset_pswd.password,
			confirm: $scope.reset_pswd.confirm,
			code: $scope.reset_pswd.code,
		}
		$http.post('/api/user/password', data).
			success(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			}).
			error(function(data, status, headers, config) {
				if(data.message)
					$scope.message = data.message
			})
	}

	$scope.addNewUser = function() {
		$http.post('/api/user', $scope.create).
			success(function(data, status, headers, config) {
				if(status == 200) {
					$scope.user = data.profile
					$scope.epoch.trades = data.trades
					$scope.reasons = data.reasons
					$scope.groupings = data.groupings
					$scope.token = data.token
					sharedProperties.setProperty('token', $scope.token)
					$scope.expires = data.expires
				}
				if(data.message)
					$scope.message = data.message
			}).
			error(function(data, status, headers, config) {
				console.log(data, status, headers, config)
				if(data.message)
					$scope.message = data.message
			})
	}

})
