angular.module("stockWatch")
.controller('stockWatchCtrl', function($scope, $http, $route, $routeParams, $location, sharedProperties) {
	
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
