angular.module("stockWatch")
.config(function($routeProvider, $locationProvider) {
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
