/*
    name: index
    purpose: Just an entry point, the top module used to create the server
*/
var trafficHandler = require("./trafficHandler")
var constants = require("./constants");
var ip = require("ip");
var app = require('express');
var server = require('http').Server(app);
var io = require('socket.io')(server)

const mongoose = require('mongoose');
const mongoDB = 'mongodb+srv://' + process.env.MONGO_DB_USERNAME + ':' + process.env.MONGO_DB_PASSWORD + '@' + process.env.MONGO_DB_CLUSTER_NUMBER +'/' + process.env.MONGO_DB_DATABASE_NAME + '?retryWrites=true&w=majority';

const PlayerModel = require('./DataBaseModels/players'); 

//const PORT = 5000;
const PORT = 8080;
const IP_ADDRESS = ip.address()

/* Connect to Mongo Data Base*/ 
mongoose.connect(mongoDB, 
    {useNewUrlParser: true,
    useUnifiedTopology: true }).then(()=>
{
    console.log("Connected to MongoDB")
    console.log("Ready to serve the clients")

    /* Server is starting to listen to PORT, at IP_ADDRESS*/
    server.listen(PORT, trafficHandler.clbkPrintNetworkInfo(PORT, IP_ADDRESS));

    /* Register Socket.io server CONNECTION event*/    
    io.on(constants.CONNECTION, function(socket)
    {
        console.log("Print auth:", socket.handshake.auth);
        trafficHandler.clbkConnectionEstablished(socket, io);
    })

}).catch(err => console.error(err))

 io.use((socket, next) => {

    // 0 - No, credentials are hardcoded    
    var areCredentialsReal = 1
    var profileUsername = socket.handshake.auth.username
    var profilePassword = socket.handshake.auth.password
    var hardcodedUsername = "aleksandarkomazec5@gmail.com"
    var hardcodedPassword = "aleksandarkomazec5"
    var userNameFound = 1;

    if(areCredentialsReal == 0)
    {
        console.log("here!!!!!!!!!!")
        profileUsername = hardcodedUsername
        profilePassword = hardcodedPassword
    }

    PlayerModel.find({username: profileUsername},
        function(err, listOfFoundUsers)
        {
            if(err)
            {
                console.log("Error!!!")
                return next(new Error("Something went wrong!"));
            }
            
            if(!listOfFoundUsers.length)
            {
                console.log("Username is not found");
                userNameFound = 0;
            }

            if(socket.handshake.auth.needToLogin == "true")
            {
                console.log("Attempt to login")
                /* Connection attempt*/
                if(userNameFound == 1)
                {
                    /* Username found, then check if the password macthes*/
                    if(listOfFoundUsers[0].password == profilePassword)//socket.handshake.auth.password)
                    {
                        /* Password macthes, then check if the profile is already connected */
                        if(listOfFoundUsers[0].currentlyOnline == false)
                        {
                            /* Regular login, accept socket connectiom from the client*/
                            next();
                        }
                        else
                        {
                            /* Player is already connected, drop the previously connected client*/
                            next();
                        }
                    }
                    else
                    {
                        return next(new Error("Invalid password"));
                    }
                    
                }
                else
                {
                    return next(new Error("Username not found"));
                }
            }
            else
            {
                console.log("Attempt to Register")
        
                /* Registration attempt*/
                if(userNameFound == 1)
                {
                    return next(new Error("Already registered"));
                }
                else
                {
                    var player = new PlayerModel({username:socket.handshake.auth.username, 
                        password:socket.handshake.auth.password,
                        currentlyOnline:'false'})
                    
                    player.save(function (err) {
                        if (err)
                        {
                            return next(new Error("Something went wrong during registration"));
                        }
                        
                        return next(new Error("User registered!"));
                      });
                    
                    
                }
            }
    });


});
