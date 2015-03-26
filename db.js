var mongoose = require('mongoose')
mongoose.connect('mongodb://0.0.0.0/respekt', function () {
  console.log('mongodb connected')
})
module.exports = mongoose
