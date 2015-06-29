var _ = require('lodash');
var fs = require('fs');
var shortid = require('shortid');
var https = require('https');
var WebSocketServer = require('ws').Server;

var insults = require('./insults');

console.debug = _.noop;

var PORT = 6543;
var VERSION = 1;


var pois = {};

/**
 * Update the game config with new POI data.
 * @param guid {String}
 * @param data {Object}
 */
function handlePoiData(guid, data) {
  console.info("New Poi Data:", data);

  if (!pois[guid]) pois[guid] = {};
  _.extend(pois[guid], data);

  Client.broadcast({msg: 'poi', guid: guid, data: pois[guid]});
}

/**
 * Add an event to the game history.
 * @param event {Object}
 */
function handleEvent(event) {
  console.info("Potentially New Event:", event);
}

var clients = {};

/**
 * A game operating client.
 *
 * @constructor
 * @param id {String} - a session id
 * @param ws {WebSocket}
 */
function Client(id, ws) {
  var self = this;
  this.id = id;
  this.connected = false;
  this.ws = ws;

  this.log("New Client!");

  ws.on('message', function(message) {
    self.debug("New Message:", message);
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return self.badLlama("failed to JSON decode message");
    }
    self.handle(msg)
  });

  clients[this.id] = this;
}

Client.prototype.log = function() {
  console.log.apply(console, ["["+this.id+"]"].concat(_.values(arguments)));
};
Client.prototype.info = function() {
  console.info.apply(console, ["["+this.id+"]"].concat(_.values(arguments)));
};
Client.prototype.debug = function() {
  console.debug.apply(console, ["["+this.id+"]"].concat(_.values(arguments)));
};

/**
 * Send a message to all connected clients.
 * @param msg {Object}
 */
Client.broadcast = function(msg) {
  _.each(clients, function(c) {c.send(msg)});
};

/**
 * Close the connection and remove the client.
 */
Client.prototype.close = function() {
  this.log("Going Away!");

  this.ws.close();
  delete clients[this.id];
};

/**
 * Send a message to the client.
 *
 * @param msg {Object}
 */
Client.prototype.send = function(msg) {
  if (this.connected) {
    this.info("Sending:", msg);
    this.ws.send(JSON.stringify(msg));
  } else {
    //TODO buffer message
    // In the meantime, drop the message on the floor.
  }
};


/** Tell the client off for not following the protocol. */
Client.prototype.badLlama = function(reason) {
  this.info("Bad Llama:", reason);

  this.send({msg: 'badLlama', reason: reason, insult: insults.random()});
  this.close();
};

/**
 * Handle a message from the client.
 * @param msg {Object}
 */
Client.prototype.handle = function(msg) {
  this.info("Received:", msg);

  if (this.connected) {
    switch(msg.msg) {
      case 'poi':
        if ((typeof msg.guid) !== 'string' || (typeof msg.data) !== 'object')
          return this.badLlama("expecting `guid` to be string and `data` to be an object");
        handlePoiData(msg.guid, msg.data);
      break;

      case 'event':
        if ((typeof msg.type) !== 'string' || (typeof msg.timestamp) !== 'number' || (typeof msg.team) !== 'string')
          return this.badLlama("`event` requires `type`, `timestamp`, and `team`");
        handleEvent(msg);
      break;

      default:
        return this.badLlama("unknown or unexpected message type `" + msg.msg + "`");
    }
  }

  // Connecting
  else {
    if (msg.msg !== 'connect') return this.badLlama("expecting `connect`");
    if (msg.version !== VERSION) {
      this.send({msg: 'failed', version: VERSION});
      return this.close();
    }
    if (msg.session !== undefined) {
      //TODO recover session
      this.send({msg: 'failed', version: VERSION});
      return this.close();
    }
    this.connected = true;
    this.send({msg: 'connected', session: this.id});
    this.sendState();
  }
};

/**
 * Send the current game config and state to the client.
 */
Client.prototype.sendState = function() {
  var self = this;

  _.each(pois, function(poi, guid) {
    self.send({msg:'poi', guid: guid, data: poi});
  });
  //TODO send them `start` if we currently want events
};

var server = https.createServer({
  key:  fs.readFileSync('key.pem').toString(),
  cert: fs.readFileSync('cert.pem').toString(),
});
var wss = new WebSocketServer({ server: server });
server.listen(PORT);

wss.on('connection', function(ws) {
  console.debug("New Connection:", ws);

  new Client(shortid.generate(), ws);
});

wss.on('error', function(e){
  console.error(e);
});

console.log("Listening...")