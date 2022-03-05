const mongoose = require('mongoose'); //among goose
const config = require('../../../../config.json');
const apis = require('../../../index').apis;
require("dotenv").config();
mongoose.connect(process.env.MONGO_HOST);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var User,
    PermGroup,
    Meta
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
  User = mongoose.model('user', userSchema);
  PermGroup = mongoose.model('permGroup', groupSchema);
  Meta = mongoose.model('meta', metaSchema)
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
                permissions: [{id: "perm", global: true}]
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
    meta("get", {key: "groups"}, bdata => {
        if(!bdata) {
            return cb("ERR_DBFAIL")
        }
        if(!bdata.blacklist) {
            let newValue = bdata;
            newValue.blacklist = ["owner"]
            meta("set", {key: "groups", value: newValue}, bdata => {
                nameBlacklist = bdata.blacklist;
            })
        }
        nameBlacklist = bdata.blacklist;
        meta("get", {key: "groups"}, udata => {
            if(!udata) {
                return cb("ERR_DBFAIL")
            }
            if(!udata.inUse) {
                let newValue = udata;
                newValue.inUse = ["owner"]
                meta("set", {key: "groups", value: newValue}, udata => {
                    namesInUse = udata.inUse;
                })
            }
            namesInUse = udata.inUse;
            if(nameBlacklist.includes(groupName)) return cb("ERR_BLACKLISTED")
            if(namesInUse.includes(groupName)) return cb("ERR_INUSE")
            let newGroup = new PermGroup({
                name: groupName,
                permissions: []
            });
            newGroup.save(err => {
                let newValue = udata
                namesInUse.push(groupName)
                newValue.inUse = namesInUse
                meta("set", {key: "groups", value: newValue}, data => {
                    if (err) {
                        apis["core-error"].api.error(err);
                        return cb("ERR_DBFAIL")
                    }
                    cb(newGroup);
                })
            });
        })
    })
    
}

function meta(action, data, cb) {
    Meta.countDocuments({}, (err, count) => {
        if (err) {
            apis["core-error"].api.error(err);
            return cb(null);
        }
        if (count > 1) {
            apis["core-error"].api.error("MORE THAN 1 META DOCUMENT. THIS IS NOT SUPPOSED TO HAPPEN");
            return process.exit(1);
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
                metap(newMeta, action, data, cb);
            });
        } else {
            Meta.findOne({}, (err, meta) => {
                if (err) {
                    apis["core-error"].api.error(err);
                    return cb(null);
                }
                metap(meta, action, data, cb);
            });
        }
    });
}

function metap(mdoc, action, data, cb) {
    switch(action) {
        case "get":
            if(!mdoc.data[data.key]) mdoc.data[data.key] = {};
            break;
        case "set":
            if(!mdoc.data[data.key]) mdoc.data[data.key] = data.value;
            mdoc.data[data.key] = data.value;
            break;
    }
    mdoc.markModified("data");
    mdoc.save(err => {
        if (err) {
            apis["core-error"].api.error(err);
            cb(null)
        } else {
            cb(mdoc.data[data.key]);
        }
    })
}

module.exports = {
    api: {getUser, getGroups, createGroup, meta},
    onMessage
}