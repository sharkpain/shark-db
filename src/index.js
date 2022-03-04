const mongoose = require('mongoose'); //among goose
const config = require('../../../../config.json');
const apis = require('../../../index').apis;
require("dotenv").config();
mongoose.connect(process.env.MONGO_HOST);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var User,
    PermGroup
db.once('open', function() {
  const userSchema = new mongoose.Schema({
    discordId: String,
	permissions: Object
  });
  const groupSchema = new mongoose.Schema({
	permissions: Object
  });
  User = mongoose.model('user', userSchema);
  PermGroup = mongoose.model('permGroup', groupSchema);
});

function getUser(discordId, cb) {
    User.findOne({discordId: discordId}, function(err, user) {
        if (err) {
            apis["core-error"].api.error(err);
            return null;
        }
        cb(user);
    });
}

function getGroups(idArray, cb) {
    PermGroup.find({$in: {_id: idArray}}, (err, groups) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb(null);
        }
        return cb(groups);
    })
}

function foc(discordId, message) {
    User.countDocuments({discordId: discordId}, function(err, count) {
        if (err) {
            apis["core-error"].api.error(err);
            message.channel.send("error happen, some features may not work right");
            return null;
        }
        if(count < 1) {
            let newUser = new User({
                discordId: discordId,
                permissions: {groups: [], permissions: []}
            });
            newUser.save(err => {
                if (err) {
                    apis["core-error"].api.error(err);
                    message.channel.send("error happen, some features may not work right");
                    return null;
                }
            });
        } else {
            getUser(discordId, user => {
                if(!user) return null;
                return user;
            })
        }
    });
}

function onMessage(message) {
    if(message.author.bot || !message.content.startsWith(config.prefix)) return;
    foc(message.author.id, message);
}

module.exports = {
    api: {getUser, getGroups},
    onMessage
}