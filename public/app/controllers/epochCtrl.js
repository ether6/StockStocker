angular.module("stockWatch")
.controller('epochCtrl', function($scope, $http, $route, $routeParams, $location, sharedProperties, stockComputer) {

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
