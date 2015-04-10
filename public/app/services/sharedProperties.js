angular.module("stockWatch")
.service('sharedProperties', function () {
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
