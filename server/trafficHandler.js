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

var rooms = [];

/* Array of connected players*/
var arrPlayers = [];
var socketIoServer

/* Represent a player*/
class Player {
    constructor(playerID, socket, x_pos, y_pos, userName) {
        this.username = userName;   /* Each player has its own unique registered username */
        this.socket = socket;       /* Each player has its own unique socket for transmitting/receiving data */
        
        /* In game data*/
        this.playerID = playerID;                  /* Player ID is unique, and each player gets playerID upon the start of the match*/
        this.x_pos = x_pos;                        /* Current x position of the player in the game */
        this.y_pos = y_pos;                        /* Current y position of the player in the game */
        this.roomID = constants.ROOM_ID_DEFAULT;   /* Each player belongs to a room, so each room has its own ID*/
        this.roomType = constants.NOT_IN_THE_ROOM; /* There are two types of rooms: COOP/PVP*/
    }
}

class Room {

    constructor() {
        this.roomStatus = constants.EMPTY;     /* Room status*/
        this.slotsRoomStatus = [false, false]; /* Track of free/reserverd IDs for the players in the room */
        this.playersIDs      = [-1, -1];       /* When a player joins a room, it should give its id to toe room */            
        this.matchInProgress = false           /* flag that indicates match is is progress */
        this.noOfReadyPlayers = 0;             /* flag that indicates numbero f players that are ready */
        this.roomName = ""                     /* Everu room has name */
    }

    getNoOfConnectedPlayers()
    {
        let noOfConnecterPlayers = 0

        for (let index = 0; index < this.slotsRoomStatus.length; index++) 
        {
            if(this.slotsRoomStatus[index] == true)
                noOfConnecterPlayers++
        }

        return noOfConnecterPlayers 
    }

    addPlayerToRoom(roomID)
    {
        let successfullyAdded = false

        if(this.roomStatus < constants.FULL)
        {
            this.upgradeRoomStatus()
            successfullyAdded = true
            console.info("Player has been added to the room " + roomID)
            console.info("Room ID " + roomID + " State: " + this.roomStatus)
        }
        
        return successfullyAdded
    }

    removePlayerFromRoom(player)
    {
        let successfullyRemoved = false

        /* Update status room, and release reserved id*/
        if(this.roomStatus > constants.EMPTY && 
           player.playerID >= 0 &&
           player.playerID < this.slotsRoomStatus.length)
        {
            this.downgradeRoomStatus()
            this.releaseRoomSloot(player.playerID)
            if(this.roomStatus === constants.EMPTY)
            {
                this.closeMatch()
            }
            console.info("Player has been removed from the room " + player.roomID)
            console.info("Room ID " + player.roomID + " State: " + this.roomStatus)
            console.info("Status of player IDs in the room: " + player.roomID +" is : " + this.slotsRoomStatus)
        }
        else
        {
            console.error("Wrong condition, roomStatus: " + this.roomStatus + "playerID: " + player.playerID)
            return successfullyRemoved
        }

        this.detachThePlayerFromTheRoom(player)
    
        successfullyRemoved = true

        return successfullyRemoved
    }

    anyFreeSpaceInRoom()
    {
        let freeSpace = true

        if(this.roomStatus == constants.FULL)
        {
            freeSpace = false
        }

        return freeSpace
    }

    findFreeIDAndReserveIt(index)
    {
        for (let i = 0; i < this.slotsRoomStatus.length; i++)
        {
            if(this.slotsRoomStatus[i] === false)
            {
                this.reserveRoomSloot(i)
                /* Assign index of a player in arrPlayers to the room*/
                this.playersIDs[i] = index
                console.info("ID: "+ i + " has been asisgned to a player")
                return i;
            }
        }
        return -555;
    }

    startMatch()
    {
        this.matchInProgress = true;
        sendUpdatedRooms()
    }

    closeMatch()
    {
        this.matchInProgress = false;
        this.resetNoOfReadyPlayers()
        sendUpdatedRooms()
    }

    upgradeRoomStatus()
    {
        this.roomStatus += 1
        sendUpdatedRooms()
    }

    downgradeRoomStatus()
    {
        this.roomStatus -= 1
        sendUpdatedRooms()
    }

    releaseRoomSloot(playerID)
    {
        this.slotsRoomStatus[playerID] = false
        this.playersIDs[playerID] = -1
    }

    reserveRoomSloot(playerID)
    {
        this.slotsRoomStatus[playerID] = true
    }

    detachThePlayerFromTheRoom(player)
    {
        player.playerID = constants.PLAYER_ID_DEFAULT
        player.roomType = constants.NOT_IN_THE_ROOM
        player.roomID = constants.ROOM_ID_DEFAULT
        player.x_pos = 0;
        player.y_pos = 0;
    }

    playerIsReady()
    {
        this.noOfReadyPlayers++
        console.info("room.noOfReadyPlayers: " +  this.noOfReadyPlayers + " for room " + this.roomName)
        
        if (this.noOfReadyPlayers === constants.MAX_NUM_PLAYERS)
        {
            this.startMatch()
        }
        else if(this.noOfReadyPlayers > constants.MAX_NUM_PLAYERS)
        {
            console.error("Error: noOfReadyPlayers " + this.noOfReadyPlayers)
        }
        else
        {
            //noOfReadyPlayers is less than constants.MAX_NUM_PLAYERS, do nothing
        }
    }

    playerGaveUp()
    {
        this.noOfReadyPlayers--
    }

    resetNoOfReadyPlayers()
    {
        this.noOfReadyPlayers = 0
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

function initModule()
{
    let tempCoopRoom = []
    let tempPvpRoom = []

    for (let index = 0; index < constants.NUMBER_OF_ROOMS; index++) 
    {
        tempCoopRoom.push(new Room())
    }

    rooms.push(tempCoopRoom)

    for (let index = 0; index < constants.NUMBER_OF_ROOMS; index++) 
    {
        tempPvpRoom.push(new Room())
    }

    rooms.push(tempPvpRoom)
}

function getRoom(roomType, roomNumber)
{
    console.info("roomType: " + roomType)
    console.info("roomNumber: " + roomNumber)
    return rooms[roomType][roomNumber]
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
    socket.on(constants.ASK_TO_JOIN_ROOM, clbkAskToJoinRoom)
    socket.on(constants.GO_OUT_FROM_ROOM, clbkRemovePlayerFromRoom)

    socket.on(constants.DISCONNECT, function()
    {
        console.log("!!!!!!!!!! Disconnection Event !!!!!!!!!!");
        let playerIndex = findThePlayerBySocketID(socket.id)
        let player = arrPlayers[playerIndex]

        /* Set the user to be signed out*/
        signingFunctions.signOutUser(player.username)

        /* Check if the player was in any rooms*/
        if(player.roomType != constants.NOT_IN_THE_ROOM)
        {
            /* The player was in the room, release the slot in the room */
            room = getRoom(player.roomType, player.roomID)
            room.removePlayerFromRoom(player, playerIndex)

            if(room.noOfReadyPlayers > 0)
            {
                room.playerGaveUp()
            }
            else
            {
                console.error("Error: room type: "+ room.roomName + " noOfReadyPlayers: " + room.noOfReadyPlayers)
            }
            
            /* Inform others in the room that this player disconnected */
            /* Note: Informing others is only important if the the players were in the room*/
            socket.to(room.roomName).emit(constants.PLAYER_DISCONNECTED, player.playerID)
        }
        else
        {
            console.info("The player was not in any rooms")
        }

        arrPlayers.splice(playerIndex,1);
        console.info("Player with index " + playerIndex + " Disconnected");

        printPlayers();

        //emit(socket,
        //    BROADCAST,
        //    constants.PLAYER_DISCONNECTED,
        //    playerId ) //Payload
        
    });
}

function printPlayers()
{
    console.info(" ========= Print all players in the table =========")
    for (let i = 0; i < arrPlayers.length; i++) 
    {
        console.info("Player " + i + ": ")
        printObject(arrPlayers[i])
    }
    console.info("===================================================")
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

function clbkSendRoomsStatus(socketID)
{
    
    socket = arrPlayers[findThePlayerBySocketID(socketID)].socket

    emit(socket, 
        EMIT_TO_SINGLE,
        constants.GET_ROOMS_STATUS_RESP,
        getRoomsState())
}
/* assignID2Player: Assign Unieque ID to the player */

/* Input parameters: 
    - socket: Client socket that is connected to the server socket 
*/
function assignID2Player(socket, player, room, index)
{
    let iDForNextPlayer = room.findFreeIDAndReserveIt(index)
    
    if(iDForNextPlayer !== -555)
    {
        /* Push newly created player to the table*/
        player.playerID = iDForNextPlayer

        console.info("room.roomName:" + room.roomName)
        console.info("iDForNextPlayer:" + iDForNextPlayer)
        //socket.to(socket.id).emit(constants.ASSIGN_ID_2_PLAYER, iDForNextPlayer)
        
        emit(socket,
            EMIT_TO_SINGLE,
            constants.ASSIGN_ID_2_PLAYER,
            iDForNextPlayer ) //Payload

        console.info(assignID2Player.name + ": id: " + iDForNextPlayer
            + " has been assigned to the client(socket value):" + socket.id )
    }
    else
    {
        /* This case should not hpapen */
        let message = "The game is full, there is no space "
        log.error("assignID2Player: " + message)

        //emit(socket, EMIT_TO_SINGLE, constants.DISCONNECT,
        //    message) //Payload
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
    let objectPrintedInOneLine = ""
    names  = Object.keys(objectInstance)
    values = Object.values(objectInstance)

    for (let i = 0; i < names.length; i++) 
    {
        if(names[i] != "socket")
        {
            objectPrintedInOneLine += names[i].toString()
            objectPrintedInOneLine += ":"
            objectPrintedInOneLine += values[i].toString()
            objectPrintedInOneLine += " "
        }
        else
        {
            objectPrintedInOneLine += "socketID"
            objectPrintedInOneLine += ":"
            objectPrintedInOneLine += values[i].id.toString()
            objectPrintedInOneLine += " "
        }
    }

    console.info(objectPrintedInOneLine)
    objectPrintedInOneLine = ""
}

/* packetPlayers: Prepare player data to be sent */

/* Output parameters: 
    - packedArrPlayers:  packet array of players' data, ready to be emmited over the network
*/
function packetPlayers(room)
{
    var packedArrPlayers = []

    for (var index = 0; index < room.playersIDs.length; index++)
    {
        let player = arrPlayers[room.playersIDs[index]]
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

function clbkRemovePlayerFromRoom(socketID)
{
    console.log("!!!!!!!!!! Remove Player from room Event !!!!!!!!!!");
    let playerIndex = findThePlayerBySocketID(socketID)
    let player = arrPlayers[playerIndex]

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        if(player.roomType != constants.NOT_IN_THE_ROOM)
        {
            room = getRoom(player.roomType, player.roomID)

            /* Inform others to remove the leaving player from the game */
            socket.to(room.roomName).emit(constants.PLAYER_DISCONNECTED, player.playerID)
            socketIoServer.to(socketID).emit(constants.GO_OUT_FROM_ROOM_RESP);

            room.removePlayerFromRoom(player, playerIndex)

            if(room.noOfReadyPlayers > 0)
            {
                room.playerGaveUp()
            }
            else
            {
                console.error("Error: room type: "+ room.roomName + " noOfReadyPlayers: " + room.noOfReadyPlayers)
            }

        }
        else
        {
            /* This is not possible case because player from ther room reqires to leave the room */
            console.error("Error: This is not possible case!")
        }
    }
    else
    {
        console.error("clbkRemovePlayerFromRoom could not be processed, player with socketID is not in the roomS")
    }
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

    arrPlayers.push(new Player(-1,socket,0.0,0.0, userName))

    sendUserNameToClient(socket, userName)
    tempSocket = socket;
}

function sendUserNameToClient(socket, userName)
{
    emit(socket,
        EMIT_TO_SINGLE,
        constants.SET_USERNAME,
        userName) //Payload

    console.debug(userName + "has been sent to the client")
}

function sendUpdatedRooms()
{
    console.info("sendUpdatedRooms")
    socketIoServer.emit(constants.GET_ROOMS_STATUS_RESP, getRoomsState());
}

function getRoomsState() 
{
    let roomsCoop = [1,2,1];
    let roomsCoopGameStarted = [false, false, false]
    let roomsPvp = [1,2,2];
    let roomsPvpGameStarted = [false, false, false]
    let packet = []

    /* Get the status of the rooms*/
    for (let iterRoomTypes = 0; iterRoomTypes < constants.NO_OF_ROOM_TYPES; iterRoomTypes++) 
    {
        for (let iterRoomIds = 0; iterRoomIds < constants.NUMBER_OF_ROOMS; iterRoomIds++) 
        {
            if(iterRoomTypes === constants.COOP_ROOMS)
            {
                roomsCoop[iterRoomIds] = rooms[iterRoomTypes][iterRoomIds].roomStatus
                roomsCoopGameStarted[iterRoomIds] = rooms[iterRoomTypes][iterRoomIds].matchInProgress;
            }
            else if(iterRoomTypes === constants.PVP_ROOMS)
            {
                roomsPvp[iterRoomIds] = rooms[iterRoomTypes][iterRoomIds].roomStatus
                roomsPvpGameStarted[iterRoomIds] = rooms[iterRoomTypes][iterRoomIds].matchInProgress;
            }
            else
            {
                log.error("Get the status of the rooms wrong case!")
            }
        }
    }

    packet.push(roomsCoop)
    packet.push(roomsCoopGameStarted)
    packet.push(roomsPvp)
    packet.push(roomsPvpGameStarted)

    return packet
}

/* ---------- Custom Event callbacks -------------------------------------------------------------------------*/

/* clbkPlayerFiresMagic: Receives the event from the player which casts the spell*/

/* Input parameters: 
    - clientID: Player's unique identifier
*/
function clbkPlayerFiresMagic(socketID, inputSchema)
{
    let player = arrPlayers[findThePlayerBySocketID(socketID)]
    let tempSocket = player.socket
    let packet = []

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        packet.push(player.playerID)
        packet.push(inputSchema)
        console.log("**********PlayerFiresMagic************" + packet)
        
        room = getRoom(player.roomType, player.roomID)

        tempSocket.to(room.roomName).emit(constants.PLAYER_FIRED_MAGIC, packet)
    }
    else
    {
        console.error("clbkPlayerFiresMagic could not be processed, player with socketID is not in the roomS")
    }
    //emit(tempSocket,
    //    BROADCAST,
    //    constants.PLAYER_FIRED_MAGIC,
    //    packet);
}

function clbkPlayerChangedDirReq(socketID)
{
    let player = arrPlayers[findThePlayerBySocketID(socketID)]
    let tempSocket = player.socket
    let packet = []

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        packet.push(player.playerID)
    // console.log("**********PlayerChangedDirReq************" + packet)

        room = getRoom(player.roomType, player.roomID)

        tempSocket.to(room.roomName).emit(constants.PLAYER_CHANGED_DIRECTION_RESP, packet)
    }
    else
    {
        console.error("clbkPlayerChangedDirReq could not be processed, player with socketID is not in the roomS")
    }
    //emit(tempSocket,
    //    BROADCAST,
    //    constants.PLAYER_CHANGED_DIRECTION_RESP,
    //    packet);
}

/* clbkUpdatePlayerInputCmd: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - socketID: Socket ID
    - inputSchema: static array of boolean values that represents possible commands (LEFT, RIGHT, JUMP, FIRE ...)
*/
function clbkUpdatePlayerInputCmd(socketID, inputSchema)
{
    let player = arrPlayers[findThePlayerBySocketID(socketID)]
    let tempSocket = player.socket
    //console.log("Player with PlayerID" + playerID + " has changed the position");
    let packet = []

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        packet.push(player.playerID)
        packet.push(inputSchema)

        room = getRoom(player.roomType, player.roomID)
        tempSocket.to(room.roomName).emit(constants.SOME_PLAYER_MOVED, packet)
    }
    else
    {
        console.error("clbkUpdatePlayerInputCmd could not be processed, player with socketID is not in the roomS")
    }
    //console.log("**********PlayerInputCmd************" + packet)

    //emit(tempSocket,
    //    BROADCAST,
    //    constants.SOME_PLAYER_MOVED,
    //    packet);
}

/* clbkRefreshPlayerTable: Refersh the players' table with lastest players' info, and broacast the table */

/* Input parameters: 
    - player_x: Player's x position
    - player_y: Player's y position
    - socketID: Player's sockedID
*/
function clbkRefreshPlayerTable(player_x, player_y, socketID)
{
    console.info("!!!!!!!!!! Refersh the players Event !!!!!!!!!!");

    let player = arrPlayers[findThePlayerBySocketID(socketID)]
    let tempPacketPlayers = [];

    player.x_pos = player_x;
    player.y_pos = player_y;
    
    console.log("Player table has been refreshed")
    printPlayers();

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        room = getRoom(player.roomType, player.roomID)
        tempPacketPlayers = packetPlayers(room)
        socketIoServer.to(room.roomName).emit(constants.UPDATE_PLAYER_TABLE, tempPacketPlayers);
    }
    else
    {
        console.error("clbkRefreshPlayerTable could not be processed, player with socketID is not in the roomS")
    }
    //socketIoServer.emit(constants.UPDATE_PLAYER_TABLE, tempPacketPlayers);
}

function clbkUpdatePlayerInputPos(player_x, player_y, socketID)
{
    console.log("!!!!!!!!!! clbkUpdatePlayerInputPos !!!!!!!!!!");

    let player = arrPlayers[findThePlayerBySocketID(socketID)]
    let socket = player.socket;

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        player.x_pos = player_x;
        player.y_pos = player_y;
        printPlayers();

        room = getRoom(player.roomType, player.roomID)

        socket.to(room.roomName).emit(constants.UPDATE_PLAYER_INPUT_POS_RESP,  new PacketedPlayerData(player.playerID, player_x, player_y))
    }
    else
    {
        console.error("clbkUpdatePlayerInputPos could not be processed, player with socketID is not in the roomS")
    }  
    //emit(arrPlayers[index].socket,
    //    BROADCAST,
    //    constants.UPDATE_PLAYER_INPUT_POS_RESP,
    //    new PacketedPlayerData(clientID, player_x, player_y));
}

async function clbkPlayerTableUpdated(socketID) {

    console.info("!!!!!!!!!! clbkPlayerTableUpdated !!!!!!!!!!");
    let player = arrPlayers[findThePlayerBySocketID(socketID)]

    if(player.roomID != constants.ROOM_ID_DEFAULT && player.roomType != constants.NOT_IN_THE_ROOM)
    {
        let roomId = player.roomID
        let roomType = player.roomType

        rooms[roomType][roomId].playerIsReady()

        console.info("Player with ID" + player.playerID + " with socketID: " + socketID + " is ready to start the game")

        if (rooms[roomType][roomId].matchInProgress === true) 
        {

            await new Promise(resolve => setTimeout(resolve, constants.SLEEPING_TIME_MS));
            console.info("All players are ready, Tell them to create enemies, and start the game")
            
            socketIoServer.to(rooms[roomType][roomId].roomName).emit(constants.CREATE_ALL_ENEMIES);

            //socketIoServer.emit(constants.CREATE_ALL_ENEMIES);
        }
    }
    else
    {
        console.error("clbkPlayerTableUpdated could not be processed, player with socketID is not in the roomS")
    }
}


/* clbkAddPlayerToTheTable: Activated when get the request to add the new player to the table */

/* Input parameters: 
    - socket:   Client socket that is connected to the server socket 
    - player_x: x coordinate of the player
    - payer_y:  y coordinate of the player
    - socketID: socket ID
*/
function clbkAddPlayerToTheTable(playerWidth, player_x, player_y, socketID)
{
    console.info("!!!!!!!!!! Add Player To the Table Event !!!!!!!!!!");
    let index = findThePlayerBySocketID(socketID);
	let player = arrPlayers[index]
    let room = getRoom(player.roomType, player.roomID)

     /* Note: -1 to eliminate itself, because player connected is called before this function */
    let noOfConnectedPlayers = room.getNoOfConnectedPlayers() - 1

    player.x_pos = player_x;
    player.y_pos = player_y;

    console.info("Number of connected players (without player: " + index + "): " + noOfConnectedPlayers + " for room " + room.roomName)

    if(noOfConnectedPlayers == 1)
    {
        let packet = []
        player.x_pos += playerWidth * constants.SPAWN_POSITION_OFFSET_MULTIPLIER
        
        packet.push(player.playerID)
        packet.push(player.x_pos)
        packet.push(player.y_pos)

        console.info("room.noOfReadyPlayers === 1, send new data to the current socket")

        emit(player.socket, 
            EMIT_TO_SINGLE, 
            constants.REDEFINED_PLAYER_POSITION,
            packet)
    }
    else if(noOfConnectedPlayers > 2)
    {
        console.error("Error for Number of connected players")
    }
    else
    {

    }

    printPlayers()

    player.socket.to(room.roomName).emit(constants.GET_UPDATED_POSITION)
    
    //emit(player.socket, 
    //    BROADCAST, 
    //    constants.GET_UPDATED_POSITION);
}

function clbkAskToJoinRoom(roomType, roomNumber, socketID)
{
    console.info("!!!!!!!!!! clbkAskToJoinRoom !!!!!!!!!!");
    // Convert roomType into int. Assume it is Coop room
    roomTypeInt = constants.COOP_ROOMS

    //sanity check for roomType
    if(roomType != "COOP" && roomType != "PVP")
    {
        console.error("clbkAskToJoinRoom: wrong roomType " + roomType)
    }
    else
    {
        if(roomType == "PVP")
        {
            roomTypeInt = constants.PVP_ROOMS
        }
    }

    //sanity check for roomNumber
    if(roomNumber < 0 || roomNumber > 3)
    {
        log.error("clbkAskToJoinRoom: wrong roomNumber " + roomNumber)
    }

    /* Check if the room is free */
    if(rooms[roomTypeInt][roomNumber].anyFreeSpaceInRoom() == true)
    {
        let index = findThePlayerBySocketID(socketID)

        /* Add the client to the room */
        rooms[roomTypeInt][roomNumber].addPlayerToRoom(roomNumber, index)
        
        /* Assign the room to the client */
        arrPlayers[index].roomID = roomNumber
        arrPlayers[index].roomType = roomTypeInt
        
        /* Add socket from scoket.io into specified room */
        socketIoRoomName = roomType + " Room " + roomNumber
        rooms[roomTypeInt][roomNumber].roomName = socketIoRoomName
        let socket = arrPlayers[index].socket
        socket.join(socketIoRoomName)

        /* Start the process of connecting client to the room*/
        assignID2Player(socket,  arrPlayers[index], rooms[roomTypeInt][roomNumber], index);
    }
    else
    {
        log.error("The room " + roomType + " room ID: " + roomNumber + " is full") 
    }
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
module.exports.initModule = initModule
