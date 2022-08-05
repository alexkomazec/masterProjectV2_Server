/*
    name: trafficHandler
    purpose: Used to:
            - Serve received events from connected sockets
            - Emits required events
            - Keeps track of active session (Number of connected players, player disconection,
                                            player positions, etc)
*/

var constants = require("./constants");
var signingFunctions = require('./index.js');

/* Types of emmiting events */
const EMIT_TO_SINGLE     = 0 // Emmit event only to the current socket
const BROADCAST          = 1 // Emmit event to all sockets (with established connection) excluding the current socket
const BROADCAST_TO_ALL   = 2 // Emmit event to all socket (with established connection) 
var arrClbk_EmmitActions = [clbkEmitToClient, clbkBroadcast, clbkBroadcastAll];

/* Array of connected players*/
var arrPlayers = [];
var socketIoServer

var playerIDsArr = [false, false, false];
var playersReadyToStart = 0;

var iDForNextPlayer = 0;

/* Note: This is just for testing purposes for getting hardcoded rooms status*/
var tempSocket;

/* Represent a player*/
class Player {
    constructor(playerID, socket, x_pos, y_pos, userName) {
        this.username = userName
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

function isGameSessionAvailable()
{
    let isGameAvailable = false;

    if(arrPlayers.length < constants.MAX_NUM_PLAYERS)
    {
        isGameAvailable = true;
    }

    return isGameAvailable
}

function findFreeID()
{
    for (let i = 0; i < playerIDsArr.length; i++)
    {
        if(playerIDsArr[i] === false)
        {
            playerIDsArr[i] = true;
            return i;
        }
    }
    return -555;
}

function registerEvents(socket)
{
    socket.on(constants.ADD_PLAYER, clbkAddPlayerToTheTable)
    socket.on(constants.REFRESH_PLAYERS_POSITION, clbkRefreshPlayerTable)
    socket.on(constants.UPDATE_PLAYER_INPUT_CMD, clbkUpdatePlayerInputCmd)
    socket.on(constants.MAGIC_FIRED, clbkPlayerFiresMagic)
    socket.on(constants.UPDATE_PLAYER_INPUT_POS, clbkUpdatePlayerInputPos)
    socket.on(constants.PLAYER_CHANGED_DIRECTION_REQ, clbkPlayerChangedDirReq)
    socket.on(constants.PLAYER_TABLE_UPDATED, clbkPlayerTableUpdated)
    socket.on(constants.GET_ROOMS_STATUS, clbkSendRoomsStatus)

    socket.on(constants.DISCONNECT, function()
    {
        console.log("!!!!!!!!!! Disconnection Event !!!!!!!!!!");
        let playerId = findThePlayerBySocketID(socket.id)

        if (playerId > -1) {
            playerIDsArr[playerId] = false;
            signingFunctions.signOutUser(arrPlayers[playerId].username)
            arrPlayers.splice(playerId,1);
            console.log("arrPlayers is " + arrPlayers);

        }
        console.log("Player with index " + playerId + " Disconnected");

        printPlayers();
        console.log("playerIDsArr:"+ playerIDsArr)

        emit(socket,
            BROADCAST,
            constants.PLAYER_DISCONNECTED,
            playerId ) //Payload
    });
}

function printPlayers()
{
    console.debug(" ========= Print all players in the table =========")
    for (let i = 0; i < arrPlayers.length; i++) 
    {
        console.debug(printPlayers.name + ": Player " + i + ": ")
        printObject(arrPlayers[i])
    }
    console.debug("===================================================")
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
    if(emitArgs.length === 0)
    {
        arrClbk_EmmitActions[emitType](socket, eventName)
    }
    else if(emitArgs.length === 1)
    {
        arrClbk_EmmitActions[emitType](socket, eventName, emitArgs[0])
    }
    else
    {
        console.error(clbkBroadcastAll.name + "Invalid Number of Arguments");
    }
}

function clbkSendRoomsStatus()
{
    let roomsCoop = [1,1,1];
    let roomsPvp = [1,1,1];
    let packet = []
    packet.push(roomsCoop)
    packet.push(roomsPvp)
    
    emit(tempSocket, 
        EMIT_TO_SINGLE,
        constants.GET_ROOMS_STATUS_RESP,
        packet)
}
/* assignID2Player: Assign Unieque ID to the player */

/* Input parameters: 
    - socket: Client socket that is connected to the server socket 
*/
function assignID2Player(socket, userName)
{
    //ppdT = new PackedPlayerDataTmep();
    //ppdT.playerID = iDForNextPlayer;

    iDForNextPlayer = findFreeID();

    if(iDForNextPlayer !== -555)
    {
        /* Push newly created player to the table*/
        arrPlayers.push(new Player(iDForNextPlayer,socket,0,0, userName));
        emit(socket,
            EMIT_TO_SINGLE,
            constants.ASSIGN_ID_2_PLAYER,
            iDForNextPlayer ) //Payload

        console.debug(assignID2Player.name + ": id: " + iDForNextPlayer
            + " has been assigned to the client(socket value):" + socket.id )
    }
    else
    {
        let message = "The game is full, there is no space "
        emit(socket, EMIT_TO_SINGLE, constants.DISCONNECT,
            message) //Payload
    }
}


/* findThePlayerByID: Find the player index if the player exists*/

/* Input parameters: 
    - playerId: Unique Id tied to a player
*/

/* Return parameters: 
    - index: The position of the player in the array
*/
function findThePlayerByID(playerId)
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

/* findThePlayerBySocketID: Find the player index if the player exists*/

/* Input parameters:
    - playerId: Unique socket ID tied to a player
*/

/* Return parameters:
    - index: The position of the player in the array
*/
function findThePlayerBySocketID(socketID)
{
    console.log("Search socketID " + socketID)

    for (let index = 0; index < arrPlayers.length; index++)
    {
        let player = arrPlayers[index];
        console.log("player ID ", player.playerID);
        console.log("socket ID ", player.socket.id);

        if(player.socket.id === socketID)
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
    console.info("Server is now running...");
	console.info("Listening to Port: ", port)
	console.info("At Address", ipAddress)
}

/* clbkConnectionEstablished: Activated when TCP connection is established */

/* Input parameters: 
    - socket: Client socket that is connected to the server socket 
*/
function clbkConnectionEstablished(socket,io, userName)
{
    /*Get the server instance from the entry point, so it can be used wherever needed*/
    socketIoServer = io

    console.info("Player Connected!");
    registerEvents(socket);

    sendUserNameToClient(socket, userName)
    tempSocket = socket;
    //assignID2Player(socket, userName);
}

function sendUserNameToClient(socket, userName)
{
    emit(socket,
        EMIT_TO_SINGLE,
        constants.SET_USERNAME,
        userName) //Payload

    console.debug(userName + "has been sent to the client")
}
/* ---------- Custom Event callbacks -------------------------------------------------------------------------*/

/* clbkPlayerFiresMagic: Receives the event from the player which casts the spell*/

/* Input parameters: 
    - clientID: Player's unique identifier
*/
function clbkPlayerFiresMagic(playerID, inputSchema)
{ 
    let tempSocket = arrPlayers[findThePlayerByID(playerID)].socket
    let packet = []
    packet.push(playerID)
    packet.push(inputSchema)
    console.log("**********PlayerFiresMagic************" + packet)

    emit(tempSocket,
        BROADCAST,
        constants.PLAYER_FIRED_MAGIC,
        packet);
}

function clbkPlayerChangedDirReq(playerID, direction)
{
    let tempSocket = arrPlayers[findThePlayerByID(playerID)].socket
    let packet = []
    packet.push(playerID)
   // console.log("**********PlayerChangedDirReq************" + packet)

    emit(tempSocket,
        BROADCAST,
        constants.PLAYER_CHANGED_DIRECTION_RESP,
        packet);
}

/* clbkUpdatePlayerInputCmd: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - playerID: player ID
    - inputSchema: static array of boolean values that represents possible commands (LEFT, RIGHT, JUMP, FIRE ...)
*/
function clbkUpdatePlayerInputCmd(playerID, inputSchema)
{
    let tempSocket = arrPlayers[findThePlayerByID(playerID)].socket
    //console.log("Player with PlayerID" + playerID + " has changed the position");
    let packet = []

    packet.push(playerID)
    packet.push(inputSchema)
    //console.log("**********PlayerInputCmd************" + packet)

    emit(tempSocket,
        BROADCAST,
        constants.SOME_PLAYER_MOVED,
        packet);
}

/* clbkRefreshPlayerTable: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - player_x: Player's x position
    - player_y: Player's y position
    - clientID: Player's unique identifier
*/
function clbkRefreshPlayerTable(player_x, player_y, clientID)
{
    console.log("!!!!!!!!!! Refersh the players Event !!!!!!!!!!");

    let index = findThePlayerByID(clientID);
    let tempPacketPlayers = [];

    arrPlayers[index].x_pos = player_x;
    arrPlayers[index].y_pos = player_y;
    
    console.log("Player table has been refreshed")
    printPlayers();
    tempPacketPlayers = packetPlayers()

    socketIoServer.emit(constants.UPDATE_PLAYER_TABLE, tempPacketPlayers);
}

function clbkUpdatePlayerInputPos(player_x, player_y, clientID)
{
    console.log("!!!!!!!!!! clbkUpdatePlayerInputPos !!!!!!!!!!");

    let index = findThePlayerByID(clientID);

    arrPlayers[index].x_pos = player_x;
    arrPlayers[index].y_pos = player_y;
    printPlayers();

    emit(arrPlayers[index].socket,
        BROADCAST,
        constants.UPDATE_PLAYER_INPUT_POS_RESP,
        new PacketedPlayerData(clientID, player_x, player_y));
}

async function clbkPlayerTableUpdated(clientID) {
    playersReadyToStart = playersReadyToStart + 1;
    console.log("Player with ID" + clientID + " is ready to start the game")

    if (playersReadyToStart === constants.MAX_NUM_PLAYERS) {

        await new Promise(resolve => setTimeout(resolve, constants.SLEEPING_TIME_MS));
        console.log("All players are ready, Tell them to create enemies, and start the game")
        socketIoServer.emit(constants.CREATE_ALL_ENEMIES);
    }
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
    console.log("!!!!!!!!!! Add Player To the Table Event !!!!!!!!!!");
    let index = findThePlayerByID(clientID);
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
    if(args.length === 0)
        /* Emit event name */
        socket.emit(eventName);
    else if(args.length === 1)
        /* Emit event name, and payload */
        socket.emit(eventName,args[0]);
    else
        log.error(clbkEmitToClient.name + "Invalid Number of Arguments");
}

/* clbkBroadcast: Broadcast event to all sockets, except current socket*/

/* Input parameters: 
    - socket:   Client socket that is connected to the server socket 
    - ...args:  Variable number of arguments:
                - eventName: Event name
                - args[0]: Payload
*/
function clbkBroadcast(socket, eventName, ...args)
{
    console.log(clbkBroadcast.name, "socket: " + socket.id + " args: "+ args)
    if(args.length === 0)
    {
        /* Emit event name */
        socket.broadcast.emit(eventName);
    }
    else if(args.length === 1)
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
module.exports.isGameSessionAvailable = isGameSessionAvailable