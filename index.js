var User = require('./models/user')
var express = require('express')
var jwt = require('jwt-simple')
var bcrypt = require('bcrypt')
var bodyParser = require('body-parser')
var request = require('request')
var url = require('url')
var nodemailer = require('nodemailer')
var app = express()
app.set('jwtTokenSecret', 'V9XDGtdRmuSdl7efUkyMGwoWSlgw1bRJCHnnZfO1E6F0VQI1EgH0OhYSAZ2tueL')
app.set('name', 'myApp')
app.set('email', 'surfingtheether@gmail.com')
app.use(bodyParser.json())
app.use('/static', express.static(__dirname + '/public'))
var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
                user: app.get('email'),
                pass: 'damn2g2m2g22'
        }
})
// middleware
var jwtauth = function(req, res, next){
    var parsed_url = url.parse(req.url, true)
    var token = (req.body && req.body.access_token) || parsed_url.query.access_token || req.headers["x-access-token"]
    if (token) {
        try {
            var decoded = jwt.decode(token, app.get('jwtTokenSecret'))
            if (decoded.exp <= Date.now()) {
                res.status(401).json({message: 'access token expired'})
                return next()
            }
            User.findById(decoded.iss, function(err, user){
                console.log(user)
                if (!err) {         
                    req.user = user                 
                    return next()
                }
            })
        } catch (err) {     
            return next()
        }
    } else {
        next()
    }
}

// It's one thing to authenticate, and it's another to require autentication
var requireAuth = function(req, res, next) {
    if (!req.user) {
        res.status(401).json({message: 'could not authenticate'})
        return next()
    } else {
        next()
    }
}

Date.prototype.getFullDate = function() {
    return date.getFullYear()+'-'+(((date.getMonth()+1)<10?'0':'') + (date.getMonth()+1))+'-'+((date.getDate()<10?'0':'') + date.getDate())
}
Date.prototype.getFullTime = function() {
    return date.getHours()+':'+((date.getMinutes()<10?'0':'') + date.getMinutes())+':'+((date.getSeconds()<10?'0':'') + date.getSeconds())
}
// app.param('id', function (req, res, next, id) {
//   next()
// })

///////////////////////////////////////////////////////////////////////
/////////////////////////////// EPOCHS ////////////////////////////////
///////////////////////////////////////////////////////////////////////
// return a list of all epochs or a single epoch if epoch_id is specified
app.get('/api/user/epoch', jwtauth, requireAuth, function (req, res, next) {
    var user = req.user
    var parsed_url = url.parse(req.url, true)
    var epoch_id = parsed_url.query.epoch_id
    if(epoch_id) {
        for(var i = 0; i < user.data.epochs.length; i++) {
            if(user.data.epochs[i]['_id'] == epoch_id) {
                res.status(200).json({epoch: user.data.epochs[i]})
                return next()
            }
        };
    } else {
        epochs = getListOfEpochs(user)
        res.status(200).json({epochs: epochs})
        return next()
    }
})

// add new epoch
app.post('/api/user/epoch', jwtauth, requireAuth, function (req, res, next) {
    var user = req.user
    console.log(req.body.epoch)
    console.log(user.data.epochs)
    user.data.epochs.push({name: req.body.epoch.name})
    console.log(user.data.epochs)
    user.save(function (err) {
        if(err) {
            res.status(401).json({message: 'could not add epoch', err: err})
            return next()
        }
        epochs = getListOfEpochs(user)
        res.status(200).json({epochs: epochs})
    })
})

// delete existing epoch
app.delete('/api/user/epoch', jwtauth, requireAuth, function (req, res, next) {
    // var id = getUserIdByToken(req.body.token)
    var user = req.user
    var parsed_url = url.parse(req.url, true)
    var epoch_id = parsed_url.query.epoch_id
    user.data.epochs.pull({ _id: epoch_id })
    user.save(function (err) {
        if(err) {
            res.status(401).json({message: 'could not delete epoch', err: err})
            return next()
        } else {
            epochs = getListOfEpochs(user)
            res.status(200).json({message: 'epoch deleted', epochs: epochs})
        }
    })
})

function getListOfEpochs(user) {
    var epochs = []
    for(var i = 0; i < user.data.epochs.length; i++) {
        epochs.push({
            name: user.data.epochs[i]['name'],
             _id: user.data.epochs[i]['_id'],
             gain: user.data.epochs[i]['gain'],
             loss: user.data.epochs[i]['loss'],
        })
    };
    return epochs
}

function getArrayNumFromEpochId(user, epoch_id) {
    for(var i = 0; i < user.data.epochs.length; i++) {
        if(user.data.epochs[i]['_id'] == epoch_id) {
            return i
        }
    };
    return -1
}

///////////////////////////////////////////////////////////////////////
/////////////////////////////// TRADES ////////////////////////////////
///////////////////////////////////////////////////////////////////////
// add new trade
app.post('/api/user/trade', jwtauth, requireAuth, function (req, res, next) {
    var user = req.user
    var epoch_array_id = getArrayNumFromEpochId(user, req.body.epoch_id)
    console.log(req.body, epoch_array_id)

    if(epoch_array_id >= 0) {
        // make sure that time_start is during trading hours
        // looks something like 7.45
        var date = new Date()
        // var current_time = date.getHours() + date.getMinutes() / 100
        console.log(date)
        // console.log(current_time)
        // if(current_time < 9.3) {
        //     // early sunday or saturday
        //     if(date.getDay() == 0)
        //         req.body.trade.time_start = new Date(date.getFullDate(1)+'T09:30:00')
        //     else if(date.getDay() == 6)
        //         req.body.trade.time_start = new Date(date.getFullDate(2)+'T09:30:00')
        //     else
        //         req.body.trade.time_start = new Date(date.getFullDate()+'T09:30:00')
        // } else if(current_time > 16.0) {
        //     // late friday or saturday 
        //     if(date.getDay() > 5)
        //         req.body.trade.time_start = new Date(date.getFullDate(8 - date.getDay())+'T09:30:00')
        //     else
        //        req.body.trade.time_start = new Date(date.getFullDate(1)+'T09:30:00')
        // } else {
        //     // sunday or saturday
        //     if(date.getDay() == 0)
        //         req.body.trade.time_start = new Date(date.getFullDate(1)+'T09:30:00')
        //     else if(date.getDay() == 6)
        //         req.body.trade.time_start = new Date(date.getFullDate(2)+'T09:30:00')
        //     else
        //        req.body.trade.time_start = new Date(+':'+)
        // }
        // req.body.trade.time_start.setTime(req.body.trade.time_start.getTime() + date.getTimezoneOffset()*60*1000)
        req.body.trade.time_start = date
        req.body.trade.timestamp_start_EDT = date.getTime()
        console.log(req.body.trade)
        user.data.epochs[epoch_array_id].trades.push(req.body.trade)
        user.save(function (err) {
            if(err) {
                res.status(401).json({message: 'could not add trade', err: err})
                return next()
            }
            res.status(200).json({
                message: 'trade added',
                trade: user.data.epochs[epoch_array_id].trades[user.data.epochs[epoch_array_id].trades.length - 1]
            })
        })
    } else
        res.status(401).json({message: 'could not add trade'})        
})

// get current trades
app.get('/api/user/trade', jwtauth, requireAuth, function (req, res, next) {
    var parsed_url = url.parse(req.url, true)
    request(parsed_url.query.target, function(err, resp, body) {
        res.status(200).json(body.replace('finance_charts_json_callback(', '').replace(')', ''))
    })
})

// delete a trade from the associated epoch
app.delete('/api/user/trade', jwtauth, requireAuth, function (req, res, next) {
    var user = req.user
    var parsed_url = url.parse(req.url, true)
    var trade_id = parsed_url.query.trade_id
    var epoch_id = parsed_url.query.epoch_id
    var epoch_array_id = getArrayNumFromEpochId(user, epoch_id)
    console.log(trade_id, epoch_id, epoch_array_id)

    if(epoch_array_id >= 0) {
        user.data.epochs[epoch_array_id].trades.pull({ _id: trade_id })
        user.save(function (err) {
            if(err) {
                res.status(401).json({message: 'could not delete trade', err: err})
                return next()
            } else {
                res.status(200).json({message: 'trade deleted', trades: user.data.epochs[epoch_array_id].trades})
                return next()
            }
        })
    } else
        res.status(401).json({message: 'Epoch not found'})
})

///////////////////////////////////////////////////////////////////////
/////////////////////////////// USERS /////////////////////////////////
///////////////////////////////////////////////////////////////////////
// Validate a username (email) and password pair
app.post('/api/authenticate', function (req, res) {
    // authenitcation with email/password comparison
    if(typeof req.body.email == undefined || typeof req.body.password == undefined) {
        // email or pswd not sent
        res.status(401).json({message: 'Please verify your email/pswd'})
    } else {
        User.findOne({'data.profile.email': decodeURIComponent(req.body.email)}, function (err, user) {
            if(err || !user) { 
                // user not found or incorrect username
                res.status(401).json({message: 'Either the username or password is incorrect'})
            } else {
                bcrypt.compare(req.body.password, user.password, function (err, compare) {
                    if(compare) {
                        var expires = new Date().setDate(new Date().getDate() + 7)
                        var token = jwt.encode({
                            iss: user['_id'],
                            exp: expires
                        }, app.get('jwtTokenSecret'))
                        var epochs = []
                        for(var i = 0; i < user.data.epochs.length; i++) {
                            epochs.push({name: user.data.epochs[i]['name'], i_d: user.data.epochs[i]['_id']})
                        };
                        res.status(200).json({
                            user: user.data.profile,
                            epochs: epochs,
                            token : token,
                            expires: expires,
                            message: 'successfully logged in',
                        })
                    } else
                        res.status(401).json({message: 'Either the username or password is incorrect'})
                }) // end password compare
            }
        })
    }
})

// User has forgotten password
app.get('/api/user/password', function (req, res) {
    var parsed_url = url.parse(req.url, true)
    var email = decodeURIComponent(parsed_url.query.email)
    User.findOne({'data.profile.email': email}, function (err, user) {
        if(err || !user) { 
                // user not found or incorrect username
                res.status(401).json({message: 'An account with that email was not found'})
            } else {
                var code = Math.floor(Math.random()*90000) + 10000
                
                // Here we email a verification code. Maybe you would rather text it?
                transporter.sendMail({
                    from: app.get('email'),
                    to: decodeURIComponent(email),
                    subject: app.get('name') + ' Verification Code',
                    text: 'Here is your verification code: ' + code,
                }, function(error, info){
                    if(error) {
                        res.status(200).json({message: 'Something went wrong. Please contact site admin at: ' + app.get('email')})
                    } else {
                        user.pswd_reset.code = code
                        user.pswd_reset.attempts = 0
                        user.save(function (err, post) {
                            // error saving user in db
                            if(err)
                                res.status(401).json(err)
                            else
                                res.status(200).json({
                                    message: 'Check your inbox for the verification code',
                                    redirect: 'reset-pswd'
                                })
                        })
                    }
                })
            }
    })
})

// Attempt to reset password
app.post('/api/user/password', function (req, res, next) {
    User.findOne({'data.profile.email': decodeURIComponent(req.body.email)}, function (err, user) {
        if(err || !user) { 
            // user not found or incorrect username
            res.status(401).json({message: 'An account with that email was not found'})
        } else {
            if(user.pswd_reset.attempts >= 3) {
                res.status(401).json({message: 'You have exceeded the maximum number of attempts'})
                return next()
            } if(req.body.password != req.body.confirm) {
                res.status(401).json({message: 'Passwords do not match'})
                return next()
            }
            if(req.body.code == user.pswd_reset.code) {
                bcrypt.genSalt(10, function (err, salt) {
                    // error encrypting pswd
                    if(err)
                        res.status(401).json(err)
                    bcrypt.hash(req.body.password, salt, function(err, crypted) {
                        // error creating hash
                        if(err)
                            res.status(401).json(err)
                        user.password = crypted
                        user.save(function (err, post) {
                            // error saving user in db
                            if(err)
                                res.status(401).json(err)
                            res.status(200).json({message: 'Password successfully reset'})
                        })
                    })
                })
            } else {
                user.pswd_reset.attempts++
                user.save(function (err, post) {
                    // error saving user in db
                    if(err)
                        res.status(401).json(err)
                    else
                        res.status(401).json({message: 'The code did not match'})
                })
            }
        }
    })
})

// Create a new user
app.post('/api/user', function (req, res) {
    if(typeof req.body.email == undefined || typeof req.body.password == undefined) {
        // username or pswd not sent
        res.status(401).json({message: 'Please verify your email/pswd'})
    } else {
        User.findOne({'data.profile.email': decodeURIComponent(req.body.email)}, function (err, user) {
            if(user) {
                res.status(401).json({message: 'This account already exists'})
            } else {
                bcrypt.genSalt(10, function (err, salt) {
                    // error encrypting pswd
                    if(err) {
                        res.status(401).json(err)
                        return next()
                    }
                    bcrypt.hash(req.body.password, salt, function(err, crypted) {
                        // error creating hash
                        if(err)
                            res.status(401).json(err)
                        // check to see if user is in the db

                        var user = new User({
                            data: {
                                profile: {
                                    email: req.body.email,
                                    name: req.body.name,
                                    commission: req.body.commission,
                                },
                            },
                            password: crypted
                        })
                        user.save(function (err, post) {
                            // error saving user in db
                            if(err)
                                res.status(401).json(err)
                            else
                                res.status(201).json({
                                    user: user.data,
                                    message: 'Account Created'
                                })
                        })
                    }) // end hash pswd
                }) // end generate salt
            }
        })
    }
})

app.get('/api/user', jwtauth, requireAuth, function (req, res) {
    res.status(200).json({user: req.user.data})
})

app.get('*', function(req, res){
  return res.redirect('/static/')
})

app.listen(3000, function () {  
    console.log('Server listening on', 3000)
})
