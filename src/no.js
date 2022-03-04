let mainFile = require('./index.js');
module.exports = {
    execute: function (message, args) {
        return
    },
    registerEventHandlers: function (cb) {
        cb("messageCreate", mainFile.onMessage);
    }
}