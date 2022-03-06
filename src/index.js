const mongoose = require('mongoose'); //among goose
const config = require('../../../../config.json');
const apis = require('../../../index').apis;
require("dotenv").config();
mongoose.connect(process.env.MONGO_HOST);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var User,
    PermGroup,
    Meta,
    Fr
db.once('open', function() {
  const userSchema = new mongoose.Schema({
    discordId: String,
	permissions: Object
  });
  const groupSchema = new mongoose.Schema({
	permissions: Object,
    name: String
  });
  const metaSchema = new mongoose.Schema({
	data: Object
  });
  const frSchema = new mongoose.Schema({
	creator: String,
    trigger: String,
    response: String,
    timesTriggered: Number,
    global: Boolean,
    forcedUnglobal: Boolean
  });
  User = mongoose.model('user', userSchema);
  PermGroup = mongoose.model('permGroup', groupSchema);
  Meta = mongoose.model('meta', metaSchema);
  Fr = mongoose.model('fr', frSchema);
});

function getUser(discordId, cb) {
    User.findOne({discordId: discordId}, function(err, user) {
        if (err) {
            apis["core-error"].api.error(err);
            cb(null)
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

function getGroup(name, cb) {
    PermGroup.findOne({name: name}, (err, group) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb(null);
        }
        return cb(group);
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
            if (config.owners.includes(discordId)) {
                ownerGroup(group => {
                    if (!group) {
                        apis["core-error"].api.error(err);
                        message.channel.send("check ur dms idot, error hit the shitter");
                        return null;
                    }
                    newUser.permissions.groups.push(group);
                    newUser.save(err => {
                        if (err) {
                            apis["core-error"].api.error(err);
                            message.channel.send("error happen, some features may not work right");
                            return null;
                        }
                    });
                })
                
            } else {
                newUser.save(err => {
                    if (err) {
                        apis["core-error"].api.error(err);
                        message.channel.send("error happen, some features may not work right");
                        return null;
                    }
                });
            }
        } else {
            getUser(discordId, user => {
                if(!user) return null;
                return user;
            })
        }
    });
}

function ownerGroup(cb) {
    PermGroup.findOne({name: "owner"}, function(err, group) {
        if(group) {
            if (err) {
                apis["core-error"].api.error(err);
                return cb(null);
            }
            cb({name: "owner", _id: group._id});
        } else {
            let newGroup = new PermGroup({
                name: "owner",
                permissions: [{id: "perm", global: true, guildOnly: []}]
            });
            newGroup.save(err => {
                if (err) {
                    apis["core-error"].api.error(err);
                    return cb(null);
                }
                cb({name: "owner", _id: newGroup._id});
            });
        }
    });
}

function onMessage(message) {
    if(message.author.bot || !message.content.startsWith(config.prefix)) return;
    foc(message.author.id, message);
}

function createGroup(groupName, cb) {
    let nameBlacklist
    let namesInUse
    focMeta(mdoc => {
        if (!mdoc)  return cb("ERR_DBFAIL")
        if (!mdoc.data.groups) mdoc.data.groups = {}
        if (!mdoc.data.groups.blacklist) mdoc.data.groups.blacklist = ["owner"]
        if (!mdoc.data.groups.inUse) mdoc.data.groups.inUse = []
        nameBlacklist = mdoc.data.groups.blacklist;
        namesInUse = mdoc.data.groups.inUse;
        if (nameBlacklist.includes(groupName)) return cb("ERR_BLACKLISTED")
        if (namesInUse.includes(groupName)) return cb("ERR_INUSE")
        let newGroup = new PermGroup({
            name: groupName,
            permissions: []
        });
        newGroup.save(err => {
            if (err) {
                apis["core-error"].api.error(err);
                return cb("ERR_DBFAIL")
            }
            namesInUse.push(groupName)
            mdoc.data.groups.inUse = namesInUse
            mdoc.markModified("data")
            mdoc.save(err => {
                if (err) {
                    apis["core-error"].api.error(err);
                    return cb("ERR_DBFAIL")
                }
                cb(newGroup);
            })
        });
    })
}

function focMeta(cb) {
    Meta.countDocuments({}, (err, count) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb(null);
        }
        if (count > 1) {
            return apis["core-error"].api.error("MORE THAN 1 META DOCUMENT. THIS IS NOT SUPPOSED TO HAPPEN");
        }
        if(count != 1) {
            let newMeta = new Meta({
                data: {}
            });
            newMeta.save(err => {
                if (err) {
                    apis["core-error"].api.error(err);
                    return cb(null);
                }
                cb(newMeta);
            });
        } else {
            Meta.findOne({}, (err, meta) => {
                if (err) {
                    apis["core-error"].api.error(err);
                    return cb(null);
                }
                cb(meta)
            });
        }
    });
}

function getFrs(cb) {
    Fr.find({}, (err, frs) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb("ERR");
        }
        return cb(frs);
    })
}

function incrementFr(frId) {
    Fr.findOne({_id: frId}, (err, fr) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb("ERR");
        }
        fr.timesTriggered++;
        fr.save();
    })
}

module.exports = {
    api: {getUser, getGroups, getGroup, createGroup, focMeta, getFrs, incrementFr},
    onMessage
}