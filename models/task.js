// Load required packages
var mongoose = require('mongoose');

// Define our task schema
var TaskSchema = mongoose.Schema({
	name: String,
	description: String,
	deadline: Date,
	completed: Boolean,
	assignedUser: String,
	assignedUserName: String,
	dateCreated: Date
});

// Export the Mongoose model
module.exports = mongoose.model('Task', TaskSchema);
