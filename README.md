ARG Minigames
=============

A scoring system for GPS based alternate reality games.

Architecture
------------

A websocket server is created in order to receive data about events in the game world. 
The data from all data sources is collated, de-duplicated and sorted in order to create
a summary as is needed for scoring.

The websocket connection is also used to set the parameters of the game, and the parameters
are sent to the clients in order to determine which information should be sent.

Game parameters are saved and loaded from a JSON file.

Protocol v1
--------

Clients communicate with the server using text/json over a websocket.

All messages have a `msg` field specifying the message type as a string.

### Connection

- `connect` client -> server: initiate or continue a connection
    - `version` number: the version to use
    - `session` string (optional): the session to continue
- `connected` server -> client: connection initiated
    - `session` string: the id of the session that is currently being used
- `failed` server -> client: connection failed. Either the version is unsuported, or the requested
    session no longer exists.
    - `version` number: the version that the server speaks

### Game Configuration

- `poi`: information about a POI
    - `guid` string: the POI identifier
    - `included` boolean: if the POI is part of the game
    - `role` string: the role of the POI in the game
    
### Events

- `start` server -> client: start sending event data

- `stop` server -> client: stop sending event data

- `event` client -> server: an event occurred
    - `type` string: the event type
    - `team` string: which team caused the event
    - `player` string (optional): the player who caused the event
    - various other fields as needed

Events of the following type can be reported:

- `capture`
    - `poi`
- `destroy`
    - `poi`
- `attack`
    - `poi`
- `link-created`
    - `poi-from`
    - `poi-to`
- `link-destroyed`
    - `poi-from`
    - `poi-to`

