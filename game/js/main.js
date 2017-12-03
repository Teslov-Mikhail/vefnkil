document.addEventListener('contextmenu', event => event.preventDefault());

var app = new PIXI.Application(window.innerWidth, window.innerHeight, {backgroundColor : 0x639BFF});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

document.body.appendChild(app.view);

var socket = io('http://wisinski.net:2137');

var players = {};

var terrainSpriteSheet  = PIXI.BaseTexture.fromImage("gfx/tileset.png");
var fuzzalionSprite = {
  "idle": PIXI.BaseTexture.fromImage("gfx/fuzzalion_idle.png"),
  "run": PIXI.BaseTexture.fromImage("gfx/fuzzalion_run.png")
}
var tilesFromTileset = [];
var tilesetSize = [ 512, 256 ];

for (var x = 0; x < tilesetSize[0] / 16; x++) {
  for (var y = 0; y < tilesetSize[1] / 16; y++) {
    tilesFromTileset[x + y*32] = new PIXI.Texture(terrainSpriteSheet, new PIXI.Rectangle(x*16, y*16, 16, 16) );
  }
}

var keys = {
  "w": "up",
  "s": "down",
  "a": "left",
  "d": "right"
}

var map = new PIXI.Container();
app.stage.addChild(map);

init();

function lerp(a, b, f) {
    return (a * (1 - f)) + (b * f);
}

var objects = [];

var Player = function( name, pos ){
  this.spriteReference;
  this.name = name;
  this.pos = {
    x: pos.x,
    y: pos.y
  };
  this.oldPos = {
    x: pos.x,
    y: pos.y
  };
  this.btnPressed = {
    "w": false,
    "s": false,
    "a": false,
    "d": false
  }
  this.moving = false;
  this.step = 0;
  this.loaded = false;

  this.lastFrameTime = 0;
  this.frame = 0;

  this.move = () => {
    if ( !this.moving ) return;
    if ( this.step >= 1 ) {
      this.moving = false;
      this.frame = 0;
      return;
    }

    this.spriteReference.x = Math.round(lerp(this.oldPos.x, this.pos.x, this.step)),
    this.spriteReference.y = Math.round(lerp(this.oldPos.y, this.pos.y, this.step))

    this.step += 0.07;

  }

  this.animate = () => {
    var time = Date.now();
    if ( time - this.lastFrameTime < 100 ){
      return;
    } else {
      this.lastFrameTime = time;
    }

    if ( this.moving ){
      this.spriteReference.texture = new PIXI.Texture(fuzzalionSprite.run, new PIXI.Rectangle(this.frame*40, 0, 40, 80) );
    } else {
      this.spriteReference.texture = new PIXI.Texture(fuzzalionSprite.idle, new PIXI.Rectangle(this.frame*40, 0, 40, 80) );
    }
    if ( this.frame*40 < this.spriteReference.texture.baseTexture.width-40 ){
      this.frame += 1;
    } else {
      this.frame = 0;
    }
  }

  this.updatePosition = ( x, y ) => {
    if ( !this.loaded ) return;
    if ( this.pos.x == x && this.pos.y == y ) return;

    this.oldPos.x = this.pos.x;
    this.oldPos.y = this.pos.y;

    this.pos.x = x;
    this.pos.y = y;

    this.step = 0;
    this.moving = true;
    // this.frame = 0;
  }

  var that = this;

  // Loading here
  this.spriteReference = new PIXI.Sprite(new PIXI.Texture(fuzzalionSprite.idle, new PIXI.Rectangle(0, 0, 40, 80) ));
  this.spriteReference.anchor.set(0.5);
  this.spriteReference.x = this.pos.x;
  this.spriteReference.y = this.pos.y;
  app.stage.addChild( this.spriteReference );
  this.loaded = true;
}

var myID;

function init() {

  socket.on('update', function (data) {
    for (player of data.players) {
      if ( players[ player.id ] ) {
        players[ player.id ].updatePosition( player.x, player.y );
      } else {
        players[ player.id ] = new Player( player.name, {x: player.x, y: player.y} );
      }
    }

    myID = socket.io.engine.id;
  });
  socket.on('remove', function (data) {
    // REMOVE PLAYER SPRITE
    app.stage.removeChild( players[data].spriteReference );

    delete players[data];
  });

  socket.on('map', function (data){
    for (layer of data.layers) {
      console.log( layer.data[ 0 + 0*32 ]  );
      for (var x = 0; x < layer.width; x++) {
        for (var y = 0; y < layer.height; y++) {
          let tile = new PIXI.Sprite( tilesFromTileset[ layer.data[ x + y*layer.width ] - 1 ] );

          tile.x = x*16;
          tile.y = y*16;
          map.addChild(tile);
        }
      }
    }
  });

  document.onkeydown = function(e){
    if( keys[e.key] ){
      socket.emit("keydown", keys[e.key]);
    };
  }

  document.onkeyup = function(e){
    if( keys[e.key] ){
      socket.emit("keyup", keys[e.key]);
    };
  }
}

var mousePos = [ -180, -260 ];
var mouseSpeed = 4;

function setDebug( msg ){
  document.getElementById("debug").innerHTML = msg;
}

var lastTimestamp = null;
var fps = 0;

setDebug( Math.floor(app.ticker.FPS) )
setInterval(function () {
  // setDebug( Math.floor(app.ticker.FPS) )
}, 1000);

app.ticker.add(function(delta) {

  for (var player in players) {
    if (players.hasOwnProperty(player)) {
      players[player].animate();
      players[player].move();
    }
  }

  if ( myID && players[myID] ){
    for (tile of map.children) {
      if (
        Math.abs( tile.x - players[myID].spriteReference.x ) > 500 ||
        Math.abs( tile.y - players[myID].spriteReference.y ) > 300
      ){
        tile.visible = false;
      } else {
        tile.visible = true;
      }
    }
  }


  if(myID){
    app.stage.position.x = app.view.width/2;
    app.stage.position.y = app.view.height/2;
    app.stage.scale.set(2);
    app.stage.pivot.x = players[myID].spriteReference.x;
    app.stage.pivot.y = players[myID].spriteReference.y;

    setDebug( players[myID].spriteReference.x + ", " + players[myID].spriteReference.y )
  }

});
