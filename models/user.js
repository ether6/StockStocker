var mongoose = require('../db')
var Schema = mongoose.Schema;

var userSchema = new Schema({
	password: { type: String, required: true },
	pswd_reset: {
		code: { type: String, required: false },
		attempts: { type: Number, required: false },
	},
	data: {
		profile: {
			email: { type: String, required: true },
			commission: { type: Number, required: true },
		},
		epochs: [{
			name: { type: String, required: true },
			gain: { type: Number, required: true, default: 0 },
			loss: { type: Number, required: true, default: 0 },
			trades: [{
				symbol: { type: String, required: true },
				num_shares: { type: Number, required: true, default: 0 },
				position: { type: String, required: true },
				initial: { type: Number, required: true, default: 0 },
				current: { type: Number, required: true, default: 0 },
				profit: { type: Number, required: true, default: 0 },
				limit: { type: Number, required: true },
				stop: { type: Number, required: true },
				note: { type: String, required: false },
				// reason: { type: String, required: true },
				day_one_cleared: { type: Boolean, required: true, default: false },
				open: { type: Boolean, required: true, default: true },
				time_start: { type: Date, required: false },
				timestamp_start_EDT: { type: Number, required: false },
				timestamp_start: { type: Number, required: false },
				time_update: { type: Date, required: false, default: Date.now },
				time_end: { type: Date, required: false}
			}]
		}]
	}
})

userSchema.pre('save', function(next){
  var date = new Date()
  this.time_update = date
  next();
});

var User = mongoose.model('User', userSchema);
module.exports = User
