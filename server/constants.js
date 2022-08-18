function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

/* Create another player n steps away */
define("SPAWN_POSITION_OFFSET_MULTIPLIER", 2)
/* Player room Id when the player is not in the room */
define("ROOM_ID_DEFAULT", -1)
/* PlayerID when the player is not in the room */
define("PLAYER_ID_DEFAULT", -1)
/* There are no players in the room */
define("EMPTY", 0)
/* One player is in the room, if matchInProgress is false, one more player cna join */
define("HALF_FULL", 1)
/* The room is full, so on one can join the room */
define("FULL", 2)

define("MAX_NUM_PLAYERS", 2)

define("SLEEPING_TIME_MS", 5000)

define("NOT_IN_THE_ROOM", -1)

define("COOP_ROOMS", 0)

define("PVP_ROOMS", 1)

define("NO_OF_ROOM_TYPES", 2)

define("NUMBER_OF_ROOMS", 3)

/* LISTEN: This event is emitted when a new TCP stream is established */
define("CONNECTION", "connection");

/* LISTEN: This event is emitted when the TCP stream is disconnect*/
define("DISCONNECT", "disconnect");

/* EMIT: This event is emitted when the server requires the most updated clients' position*/
define("GET_UPDATED_POSITION", "getUpdatedPosition");

/* EMIT: This event is emitted to assign available id to the client*/
define("ASSIGN_ID_2_PLAYER", "assignID2Player");

/* LISTEN: This event is emitted on request, when the request is received from the client, add the player do the table*/
define("ADD_PLAYER", "addPlayer");

/* EMIT: This event is emitted to update all connected clients data */
define("UPDATE_PLAYER_TABLE", "updatePlayerTable")

/* LISTEN: This event is emitted on request, when the player sends its property such as position*/
define("REFRESH_PLAYERS_POSITION", "refreshPlayersPosition")

/* EMIT: This event is used to notify clients that some player has moved */
define("SOME_PLAYER_MOVED","playerMoved")

/* EMIT: This event is used to get the information that magic has fired by some player*/
define("MAGIC_FIRED","magicFired")

/* EMIT: This event is used to broadcast information that some player fires magic*/
define("PLAYER_FIRED_MAGIC","playerFiredMagic")

/* LISTEN: This event is emitted on request, when the player moves, player must notify server, and server should broadcast that*/
define("UPDATE_PLAYER_INPUT_CMD", "updatePlayerInputCmd")

define("UPDATE_PLAYER_INPUT_POS", "updatePlayerInputPosition")

define("UPDATE_PLAYER_INPUT_POS_RESP", "updatePlayerInputPositionResp")

define("PLAYER_CHANGED_DIRECTION_REQ", "playerChangedDirReq")

define("PLAYER_CHANGED_DIRECTION_RESP", "playerChangedDirResp")

define("PLAYER_DISCONNECTED", "playerDisconnected")

/* Server has been informed that the client updated its player table */
define("PLAYER_TABLE_UPDATED", "playerTableUpdated")

/* Inform Clients that should create everything on the map, and start the game */
define("CREATE_ALL_ENEMIES", "createAllEnemies")

/* The server sends the username to the client */
define("SET_USERNAME", "setUsername")

/* The server receives the request for getting current rooms status */
define("GET_ROOMS_STATUS", "getRoomsStatusReq")

/* The server sends the answer for getRoomsStatusReq reqyest */
define("GET_ROOMS_STATUS_RESP", "getRoomsStatusResp")

/* The server receives the request from the client to join a room */
define("ASK_TO_JOIN_ROOM", "askToJoinRoom")

/* Send the client new redefined position */
define("REDEFINED_PLAYER_POSITION", "redefinedPlayerPosition")

/* LISTEN: Receives the request to go out from the room */
define("GO_OUT_FROM_ROOM", "goOutFromRoom")

/* EMIT: Send the response to go out from the room */
define("GO_OUT_FROM_ROOM_RESP", "goOutFromRoomResp")
