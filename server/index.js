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
const { domainToUnicode } = require("url");

var profileUsername
var profilePassword

//console.log = function() {}
//console.info = function () {}
//console.debug = function() {}
//console.warn = function() {}
//console.error = function() {}

//const PORT = 5000;
const PORT = 8080;
const IP_ADDRESS = ip.address()

/* Connect to Mongo Data Base*/ 
mongoose.connect(mongoDB, 
    {useNewUrlParser: true,
    useUnifiedTopology: true }).then(()=>
{
    console.info("Connected to MongoDB")
    console.info("Ready to serve the clients")

    /* Reset online satus */
    setAllPlayersOffline()

    /* Server is starting to listen to PORT, at IP_ADDRESS*/
    server.listen(PORT, trafficHandler.clbkPrintNetworkInfo(PORT, IP_ADDRESS));

    trafficHandler.initModule();

    /* Register Socket.io server CONNECTION event*/    
    io.on(constants.CONNECTION, function(socket)
    {
        console.log("Print auth:", socket.handshake.auth);
        trafficHandler.clbkConnectionEstablished(socket, io, profileUsername);
    })

}).catch(err => console.error(err))

 io.use((socket, next) =>
 {

     // 0 - No, credentials are hardcoded
     const areCredentialsReal = 1;
     profileUsername = socket.handshake.auth.username
     profilePassword = socket.handshake.auth.password
     const hardcodedUsername = "aleksandarkomazec5@gmail.com";
     const hardcodedPassword = "aleksandarkomazec5";

     if (areCredentialsReal === 0) {
         profileUsername = hardcodedUsername
         profilePassword = hardcodedPassword
     }

     if (socket.handshake.auth.needToLogin === "true")
     {
         /* Do Logging, hint: forward next registered middleware function name */
         processLogin(next)
     }
     else
     {
         /* Do Registration */
         processRegister(next,socket)
     }
 })

    function processLogin(next)
    {
        console.log("Attempt to login")

        PlayerModel.find({username: profileUsername}, function (err, listOfFoundUsers)
        {
            /* Check for the error */
            if (err)
            {
                console.log("Error!!!")
                return next(new Error("Something went wrong!"));
            }


            /* Check for findings in data base */
            if (!listOfFoundUsers.length) {
                return next(new Error("Username is not found"));
            }

            /* Check for duplication */
            if(listOfFoundUsers.length > 1)
            {
                return next(new Error("Internal Error: More than one player found"));
            }

            /* Check if the user is currently online*/
            if (listOfFoundUsers[0].currentlyOnline === "true")
            {
                return next(new Error("User has been already loged in"));
            }

            /* Username found, then check if the password macthes*/
            if (listOfFoundUsers[0].password !== profilePassword)//socket.handshake.auth.password)
            {
                return next(new Error("Invalid password"));
            }

            /* Regular login, accept socket connectiom from the client*/
            updateTheDocument(listOfFoundUsers[0].username.toString(),
                'currentlyOnline',
                'true')
            next();
        })
    }

    function processRegister(next, socket)
    {
        console.log("Attempt to Register")

        PlayerModel.find({username: profileUsername}, function (err, listOfFoundUsers)
        {

            /* Check for the error */
            if (err)
            {
                console.log("Error!!!")
                return next(new Error("Something went wrong!"));
            }

            /* Check for findings in data base */
            if (listOfFoundUsers.length) {
                return next(new Error("Already registered"));
            }

            const player = new PlayerModel({
                username: socket.handshake.auth.username,
                password: socket.handshake.auth.password,
                currentlyOnline: 'false'
            });
            saveTheDocument(player, next)
        })
    }

    /* Insert the new document if does not exist*/
    function saveTheDocument(mongooseModel, next)
    {
        mongooseModel.save(function (err) {
        if (err)
        {
            return next(new Error("Something went wrong during registration"));
        }

        return next(new Error("User registered!"));
    
    });
    }

     /* ========== Update one document ==========
     *  userName - String
     *  fieldName - Field that Model schema should contain
     *  fieldValue - Field value that should be string
     * */
     async function updateTheDocument(userName, fieldName, filedValue)
     {

         let res;

         if(fieldName === "currentlyOnline")
         {
             res = await PlayerModel.updateOne({username: userName}, {currentlyOnline: filedValue});
         }
         else
         {
             console.log("Wrong fieldName")
             return
         }

         if(res.matchedCount === 0)
         {
             console.log("No matching document")
         }
     }


     async function setAllPlayersOffline()
     {
         PlayerModel.find({}, function (err, listOfFoundUsers)
         {
             for (let i = 0; i < listOfFoundUsers.length; i++)
             {
                 updateTheDocument(listOfFoundUsers[i].username.toString(),
                     'currentlyOnline',
                     'false')
             }
         })
     }

     exports.signOutUser = function signOutUser(username)
     {
         console.log("user signed out!")
         updateTheDocument(username, "currentlyOnline", "false")
     }

