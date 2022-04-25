function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

/* This event is emitted when a new TCP stream is established */
define("CONNECTION", "connection");

/* This evenet is emmited when the TCP stream is disconnect*/
define("DISCONNECT", "disconnect");

/* This evenet is emitted when the server requires the most updated clients' position*/
define("GET_UPDATED_POSITION", "getUpdatedPosition");

/* This event is emitted when the player is disconnected */
define("PLAYER_DISCONNECTED", "playerDisconnected");

/* This event is emitted to assign available id to the client*/
define("ASSIGN_ID_2_PLAYER", "assignID2Player");

/* This event is emitted on request, when the request is received from the client, add the player do the table*/
define("ADD_PLAYER", "addPlayer");

/* This event is emmited to update all connected clients data */
define("UPDATE_PLAYER_TABLE", "updatePlayerTable")

/* This event is emmited on request, when the player sends its property such as position*/
define("REFRESH_PLAYERS_POSITION", "refreshPlayersPosition")

/* This event is emmited on request, when the player moves, player must notify server, and server should broadcast that*/
define("UPDATE_PLAYER_POSITION", "updatePlayerPosition")

/* This event is used to notify clients that some player has moved */
define("SOME_PLAYER_MOVED","playerMoved")

/* This event is used to get the information that magic has fired by some player*/
define("MAGIC_FIRED","magicFired")

/* This event is used to broadcast information that some player fires magic*/
define("PLAYRED_FIRED_MAGIC","playerFiredMagic")
