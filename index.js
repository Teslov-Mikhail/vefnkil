var app = require('http').createServer();
var io = require('socket.io')(app);
var jetpack = require('fs-jetpack');
var pathfinding = require('pathfinding');

app.listen(2137);

var names = [
  "Andrzej",
  "Bartosz",
  "Arnold",
  "Henryk",
  "Zbigniew",
  "Artur",
  "Adrian",
  "Jarosław"
];

var Player = function( id ){
  this.id = id;
  this.name = names[ Math.round(Math.random()*names.length) ];
  this.x = 1017;
  this.y = 950;
  this.speed = 5;
  this.keysDown = {};sd
  this.angle = 0;
  this.moving = false;
}

var players = [];

function getPlayerById( id ){
  for (var i = 0; i < players.length; i++) {
    if ( players[i].id === id ){
      return i;
    }
  }
  return false;
}

var map = [
  jetpack.read("data/maps/map01.json", "json")
]

io.on('connection', function (socket) {
  console.log( socket.id + "connected" );

  players.push( new Player(socket.id) );

  socket.emit("map", map[0] );

  socket.on("disconnect", function(){
    players.splice( getPlayerById( socket.id ), 1 );

    io.emit("remove", socket.id);
  })

  socket.on("keydown", function(key){
    var id = getPlayerById( socket.id );

    players[id].keysDown[key] = true;
  });
  socket.on("keyup", function(key){
    var id = getPlayerById( socket.id );

    players[id].keysDown[key] = false;
  });

});

function update(){

  for (player of players) {
    if ( player.keysDown.up && !player.keysDown.down && !player.keysDown.left && !player.keysDown.right ) player.angle = 1.5 * Math.PI;
    if ( !player.keysDown.up && player.keysDown.down && !player.keysDown.left && !player.keysDown.right ) player.angle = 0.5 * Math.PI;
    if ( !player.keysDown.up && !player.keysDown.down && player.keysDown.left && !player.keysDown.right ) player.angle = Math.PI;
    if ( !player.keysDown.up && !player.keysDown.down && !player.keysDown.left && player.keysDown.right ) player.angle = 0;
    if ( player.keysDown.up && !player.keysDown.down && player.keysDown.left && !player.keysDown.right ) player.angle = 1.25 * Math.PI;
    if ( player.keysDown.up && !player.keysDown.down && !player.keysDown.left && player.keysDown.right ) player.angle = 1.75 * Math.PI;
    if ( !player.keysDown.up && player.keysDown.down && player.keysDown.left && !player.keysDown.right ) player.angle = 0.75 * Math.PI;
    if ( !player.keysDown.up && player.keysDown.down && !player.keysDown.left && player.keysDown.right ) player.angle = 0.25 * Math.PI;
    if ( player.keysDown.up || player.keysDown.down || player.keysDown.left || player.keysDown.right ){
      player.moving = true;
    } else {
      player.moving = false;
    }

    if ( player.moving ) {
      player.x += Math.cos( player.angle ) * player.speed;
      player.y += Math.sin( player.angle ) * player.speed;
    }
  }

  io.emit("update", { players: players });

  setTimeout(function () {
    update();
  }, 30);
}

update();
