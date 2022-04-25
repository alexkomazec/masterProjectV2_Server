import * as constants from './constants.js';
import {connectionEstablished} from './trafficHandler.js';

var app = require('express');
var server = require('http').Server(app);
export var io = require('socket.io')(server)

/*
	- player unique id
	- socket id

	player properties:
	- x positon
	- y position
*/
var players = [];
var iDForNextPlayer = 0;

function Player(playerID, socketID, x_pos, y_pos){
	
	this.playerID 	= playerID;
	this.socketID 	= socketID;
	this.x_pos 		= x_pos;
	this.y_pos 		= y_pos;
}


function  ServerIsOn(port,ipAddress)
{
	console.log("Server is now running...");
	console.log("Listening to Port: ", port)
	console.log("At Address", ipAddress)
}

port = 5000
ipAddress = '138.68.160.152'
server.listen(port, ServerIsOn(port, ipAddress));


function assignID2Player(socket)
{
	/* Push newly created player to the table*/
	players.push(new Player(iDForNextPlayer,socket.id,0,0));

	socket.emit("assignID2Player", iDForNextPlayer);
	iDForNextPlayer++;
}

io.on(constants.CONNECTION, function(socket)
{
		console.log("Player Connected!");

		/* Ask all currently connected clients (except this one) to emit last updated data*/
		//socket.broadcast.emit("GetUpdatedPosition");

		socket.on("UpdatePlayerPosition",function(playerID, moveDirection)
		{
			console.log("Player with PlayerID" + playerID + " has changed the position");
			
			socket.broadcast.emit("FromServer_PlayerMoved", playerID, moveDirection);
		});

		assignID2Player(socket);

		socket.on("addPlayer",function(player_x, player_y, clientID)
		{
			let index = findThePlayer(clientID);
			
			players[index].x_pos = player_x;
			players[index].y_pos = player_y;
			
			socket.broadcast.emit("getUpdatedPosition");
		});

		socket.on("refreshPlayersPosition",function(player_x, player_y, clientID)
		{
			let index = findThePlayer(clientID);
			
			players[index].x_pos = player_x;
			players[index].y_pos = player_y;
			
			console.log("Refreshed player table")
			printPlayers();

			io.emit('updatePlayerTable', players);

		});

	//socket.emit('socketID', { id: socket.id });
	//socket.broadcast.emit('newPlayer', { id: socket.id });
	
	socket.on('disconnect', function(){
		console.log("Player Disconnected");
		socket.broadcast.emit('playerDisconnected', { id: socket.id });
	});



	socket.on("UP",function()
	{
			console.log("UP")
	});
	socket.on("DOWN",function()
	{
		console.log("DOWN")
	});
	socket.on("LEFT",function()
	{
		console.log("LEFT")
	});
	socket.on("RIGHT",function()
	{
		console.log("RIGHT")
	});

	socket.on("AAA",function(counter)
	{
		console.log("AAA" + counter);
	});
	

});

function findThePlayer(playerId)
{
	console.log("Search playerID " + playerId)

	//console.log("players");

	//for loop
	//for(var i=0; i< players.length; i++){
	//	console.log("player playerID= " + players[i].playerID);
	//	console.log("player socketID= " + players[i].socketID);
	//}

    for (let index = 0; index < players.length; index++) 
    {
        player = players[index];
        console.log("player.playerId ", player.playerID);
		console.log("player.socketID ", player.socketID);

        if(player.playerID == playerId)
        {
            return index;
        }
    }

	console.log("Element in the array has not found")
}


function printPlayers()
{
	console.log("Players print:")
	for(var i=0; i< players.length; i++)
	{
		console.log( "player playerID = " + players[i].playerID
					+" player socketID = " + players[i].socketID
					+" player x_pos =" + players[i].x_pos
					+" player y_pos=" + players[i].y_pos);
	}
}
