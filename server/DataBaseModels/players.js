const mongoose = require('mongoose');

/* Create schema*/
const playerSchema = new mongoose.Schema
(
    {
        username: 
        {
            type:String, required: true 
        },
        password:
        {
            type:String, required: true
        },
        currentlyOnline:
        {
            type:String, required: true
        }
    }
)

/* Compile schema into model*/
const PlayerModel = mongoose.model('Player', playerSchema);
module.exports = PlayerModel