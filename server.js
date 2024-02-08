require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Define the middleware function to check if a user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Socket.io logic
const rooms = {};

// Server-side
io.on('connection', (socket) => {
  socket.on('joinRoom', (roomCode, username) => {
    socket.join(roomCode);
    socket.username = username;

    // Broadcast to all participants in the room that a new user has joined
    io.to(roomCode).emit('userJoined', username);

    // Send the current list of participants to the new user
    const participants = getParticipants(roomCode);
    socket.emit('updateParticipants', participants);
  });

  socket.on('sendMessage', (username, message) => {
    const roomCode = Object.keys(socket.rooms).filter(item => item!=socket.id)[0];
    console.log(message);
    io.to(roomCode).emit('receiveMessage', username, message);
  });

  socket.on('codeUpdate', (code) => {
    setCode(newCode);
    const roomCode = Object.keys(socket.rooms).filter(item => item!=socket.id)[0];
    socket.to(roomCode).emit('updateCode', code);
  });

  socket.on('disconnect', () => {
    // Handle user disconnect, update participants and notify others
  });
});

function getParticipants(roomCode) {
  // Helper function to get a list of participants in a room
  const participants = [];
  const room = io.sockets.adapter.rooms.get(roomCode);

  if (room) {
    room.forEach((socketId) => {
      participants.push(io.sockets.sockets.get(socketId).username);
    });
  }

  return participants;
}

// Routes for the authentication system
app.get('/', function (req, res) {
  res.render('login');
});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.get('/editor', ensureAuthenticated, function (req, res) {
  User.find({ 'secret': { $ne: null } })
    .then(foundUsers => {
      if (foundUsers) {
        res.render('editor', { usersWitheditor: foundUsers });
      }
    })
    .catch(err => {
      console.log(err);
      res.redirect('/error');
    });
});

app.get('/logout', function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

app.post('/signup', function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.error(err);
      return res.redirect('/signup');
    }
    passport.authenticate('local')(req, res, function () {
      res.redirect('/editor');
    });
  });
});

// Use passport.authenticate as middleware for login route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/editor',
  failureRedirect: '/login'
}));

const port = process.env.PORT || 3000; // Use dynamic port
server.listen(port, function () {
  console.log(`Server started on port ${port}.`);
});
