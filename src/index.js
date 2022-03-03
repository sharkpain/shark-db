const mongoose = require('mongoose'); //among goose
require("dotenv").config();
mongoose.connect(process.env.MONGO_HOST);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var Test
db.once('open', function() {
  const testSchema = new mongoose.Schema({
	commandOutput: String
  });
  Test = mongoose.model('test', testSchema);
});

function pissjar(cb) {
    Test.find({}, function(err, tests) {
        if (err) return console.error(err);
        cb(tests[0]);
    });
}
function create(input) {
    let test = new Test({
        commandOutput: input
    });
    test.save();
}
function edit(input) {
    Test.find({}, function(err, tests) {
        if (err) return console.error(err);
        tests[0].commandOutput = input;
        tests[0].save();
    });
}
module.exports = {
    api: {pissjar, create, edit}
}