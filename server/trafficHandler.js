/*
    name: trafficHandler
    purpose: Used to:
            - Serve received events from connected sockets
            - Emits required events
            - Keeps track of active session (Number of connected players, player disconection,
                                            player positions, etc)
*/

var constants = require("./constants");

/* Types of emmiting events */
const EMIT_TO_SINGLE     = 0 // Emmit event only to the current socket
const BROADCAST          = 1 // Emmit event to all sockets (with established connection) excluding the current socket
const BROADCAST_TO_ALL   = 2 // Emmit event to all socket (with established connection) 
var arrClbk_EmmitActions = [clbkEmitToClient, clbkBroadcast, clbkBroadcastAll];

/* Array of connected players*/
var arrPlayers = [];
var iDForNextPlayer = 0;
var socketIoServer

/* Represent a player*/
class Player {
    constructor(playerID, socket, x_pos, y_pos) {

        this.playerID = playerID;
        this.socket = socket;
        this.x_pos = x_pos;
        this.y_pos = y_pos;
    }
}

/* Represent a packet player, ready to be emmited to clients*/
/* Reason for decision: Player class contains a field  this.socket that represents saved socket,
   so the server has all client sockets.
   PROBLEM: Socket class has circular dependencies so when try to emmit arrPlayers it causes
   stack overflow because circular dependencies (In other words, JSON.stringify works behind for
   a developer. But because there is a circular dependency reccursion is infinite, and it
   causes stack overflow)
*/
class PacketedPlayerData {
    constructor(playerID, x_pos, y_pos) {
        this.playerID = playerID;
        this.x_pos = x_pos;
        this.y_pos = y_pos;
    }
}

/*  ---------- Regular functions -----------------------------------------------------------------------------*/

function registerEvents(socket)
{
    socket.on(constants.DISCONNECT, clbkPrintOnDisconnect)
    socket.on(constants.ADD_PLAYER, clbkAddPlayerToTheTable)
    socket.on(constants.REFRESH_PLAYERS_POSITION, clbkRefreshPlayerTable)
    socket.on(constants.UPDATE_PLAYER_POSITION, clbkUpdatePlayerPosition)
    socket.on(constants.MAGIC_FIRED, clbkPlayerFiresMagic)
}

function printPlayers()
{
    console.debug(" ========= Print all players in the table =========")
    for (let i = 0; i < arrPlayers.length; i++) 
    {
        console.debug(printPlayers.name + ": Player " + i + ": ")
        printObject(arrPlayers[i])
    }
    console.debug(" ========= All Players have been printed =========")
}

/* emit: This is a warpper function to socket.io emit options*/

/* Input parameters: 
    - socket:    Client socket that is connected to the server socket 
    - emitType:  Represents the type of emit ( example: emmit data to only one socket or to broadcast data)
    - eventName: Name of the event
    - emitArgs:  Data that should be emitted 
*/
function emit(socket, emitType, eventName, ...emitArgs)
{
    if(emitArgs.length == 0)
    {
        arrClbk_EmmitActions[emitType](socket, eventName)
    }
    else if(emitArgs.length == 1)
    {
        arrClbk_EmmitActions[emitType](socket, eventName, emitArgs[0])
    }
    else
    {
        log.error(clbkBroadcastAll.name + "Invalid Number of Arguments");
    }
}

/* assignID2Player: Assign Unieque ID to the player */

/* Input parameters: 
    - socket: Client socket that is connected to the server socket 
*/
function assignID2Player(socket)
{
	/* Push newly created player to the table*/
	arrPlayers.push(new Player(iDForNextPlayer,socket,0,0));
    emit(socket, 
        EMIT_TO_SINGLE, 
        constants.ASSIGN_ID_2_PLAYER, 
        iDForNextPlayer) //Payload

    console.debug(assignID2Player.name + ": id: " + iDForNextPlayer 
                + " has been assigned to the client(socket value):" + socket.id )

	iDForNextPlayer++;
}


/* findThePlayer: Find the player index if the player exists*/

/* Input parameters: 
    - playerId: Unique Id tied to a player
*/

/* Return parameters: 
    - index: The position of the player in the array
*/
function findThePlayer(playerId)
{
	console.log("Search playerID " + playerId)

    for (let index = 0; index < arrPlayers.length; index++) 
    {
        let player = arrPlayers[index];
        console.log("player ID ", player.playerID);
		console.log("socket ID ", player.socket.id);

        if(player.playerID == playerId)
        {
            return index;
        }

    }

    console.log("Element in the array has not found")
    return -1;
}

/* printObject: Print all values of the object */

/* Input parameters: 
    - objectInstance:  Object that should be printed
*/
function printObject(objectInstance)
{
    names  = Object.keys(objectInstance)
    values = Object.values(objectInstance)

    for (let i = 0; i < names.length; i++) 
    {
        console.log(names[i] + ":" + values[i])
    }

}

/* packetPlayers: Prepare player data to be sent */

/* Output parameters: 
    - packedArrPlayers:  packet array of players' data, ready to be emmited over the network
*/
function packetPlayers()
{
    var packedArrPlayers = []

    for (let player of arrPlayers) 
    {
        packedArrPlayers.push(new PacketedPlayerData(player.playerID, player.x_pos, player.y_pos))
    }

    return packedArrPlayers  
}

/*  --- Low level Communication Event Callbacks -------------------------------------------------------------*/

/* clbkPrintNetworkInfo: Print network data*/

/* Input parameters: 
    - port:         Used port
    - ipAddress:    Used IPv4 Address
*/
function clbkPrintNetworkInfo(port, ipAddress)
{
    console.log("Server is now running...");
	console.log("Listening to Port: ", port)
	console.log("At Address", ipAddress)
}

/* clbkConnectionEstablished: Activated when TCP connection is established */

/* Input parameters: 
    - socket: Client socket that is connected to the server socket 
*/
function clbkConnectionEstablished(socket,io, arrPlayers)
{
    /*Get the server instance from the entry point, so it can be used wherever needed*/
    socketIoServer = io

    console.debug("Player Connected!");
    registerEvents(socket);

    assignID2Player(socket, arrPlayers);
}

/* clbkPrintOnDisconnect: Print some message on disconnect event */
function clbkPrintOnDisconnect() 
{ 
    console.log("Player Disconnected");
}

/* ---------- Custom Event callbacks -------------------------------------------------------------------------*/

/* clbkPlayerFiresMagic: Receives the event from the player which casts the spell*/

/* Input parameters: 
    - clientID: Player's unique identifier
*/
function clbkPlayerFiresMagic(clientID)
{ 
    let tempSocket = arrPlayers[findThePlayer(clientID)].socket
    emit(tempSocket, BROADCAST, constants.PLAYRED_FIRED_MAGIC, 
        clientID) //Payload
}

/* clbkUpdatePlayerPosition: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - player_x: Player's x position
    - player_y: Player's y position
    - clientID: Player's unique identifier
*/
function clbkUpdatePlayerPosition(playerID, moveDirection)
{
    let tempSocket = arrPlayers[findThePlayer(playerID)].socket
    console.log("Player with PlayerID" + playerID + " has changed the position");
    let packet = []

    packet.push(playerID)
    packet.push(moveDirection)
    
    emit(tempSocket, 
        BROADCAST, 
        constants.SOME_PLAYER_MOVED, 
        packet)
}

/* clbkRefreshPlayerTable: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - player_x: Player's x position
    - player_y: Player's y position
    - clientID: Player's unique identifier
*/
function clbkRefreshPlayerTable(player_x, player_y, clientID)
{
    let index = findThePlayer(clientID);
    let tempPacketPlayers = [];

    arrPlayers[index].x_pos = player_x;
    arrPlayers[index].y_pos = player_y;
    
    console.log("Player table has been refreshed")
    printPlayers();
    tempPacketPlayers = packetPlayers()

    socketIoServer.emit(constants.UPDATE_PLAYER_TABLE, tempPacketPlayers);
}

/* clbkAddPlayerToTheTable: Activated when get the request to add the new player to the table */

/* Input parameters: 
    - socket:   Client socket that is connected to the server socket 
    - player_x: x coordinate of the player
    - payer_y:  y coordinate of the player
    - clientID: Unique client id
*/
function clbkAddPlayerToTheTable(player_x, player_y, clientID)
{ 
    let index = findThePlayer(clientID);
	let player = arrPlayers[index]

    player.x_pos = player_x;
    player.y_pos = player_y;

    printPlayers()

    emit(player.socket, 
        BROADCAST, 
        constants.GET_UPDATED_POSITION);

}

/* clbkEmitToClient: Emit event to socket*/

/* Input parameters: 
    - socket:   Client socket that is connected to the server socket 
    - ...args:  Variable number of arguments:
                - eventName: Event name
                - args[0]: Payload
*/
function clbkEmitToClient(socket, eventName, ...args)
{
    console.log(clbkEmitToClient.name, "socket: " + socket.id + " args: "+ args)
    if(args.length == 0)
        /* Emit event name */
        socket.emit(eventName);
    else if(args.length == 1)
        /* Emit event name, and payload */
        socket.emit(eventName,args[0]);
    else
        log.error(clbkEmitToClient.name + "Invalid Number of Arguments");
}

/* clbkBroadcast: Broadcast event to all socket, except current socket*/

/* Input parameters: 
    - socket:   Client socket that is connected to the server socket 
    - ...args:  Variable number of arguments:
                - eventName: Event name
                - args[0]: Payload
*/
function clbkBroadcast(socket, eventName, ...args)
{
    console.log(clbkBroadcast.name, "socket: " + socket.id + " args: "+ args)
    if(args.length == 0)
    {
        /* Emit event name */
        socket.broadcast.emit(eventName);
    }
    else if(args.length == 1)
        /* Emit event name, and payload */
        socket.broadcast.emit(eventName,args[0]);
    else
        log.error(clbkBroadcast.name + "Invalid Number of Arguments");
}

/* clbkBroadcastAll: Broadcast event to all sockets*/

/* Input parameters: 
    - ...args:  Variable number of arguments:
                - eventName: Event name
                - args[0]: Payload
*/
function clbkBroadcastAll(eventName, ...args)
{
    console.log(clbkBroadcastAll.name, "socket: " + socket.id + " args: "+ args)
    if(args.length == 0)
        /* Emit event name */
        socketIoServer.emit(eventName);
    else if(args.length == 1)
        /* Emit event name, and payload */
        socketIoServer.emit(eventName, args[0]);
    else
        log.error(clbkBroadcastAll.name + "Invalid Number of Arguments");
}

module.exports.clbkPrintNetworkInfo = clbkPrintNetworkInfo
module.exports.clbkConnectionEstablished = clbkConnectionEstablished