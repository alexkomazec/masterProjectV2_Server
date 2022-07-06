function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("MAX_NUM_PLAYERS", 2)

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