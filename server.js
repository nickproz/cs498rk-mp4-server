// Get the packages we need
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var router = express.Router();

var User = require('./models/user');
var Task = require('./models/task');

// Connect to our MLab database
mongoose.connect('mongodb://nickproz:bearsrock@ds028679.mlab.com:28679/cs498rk1-mp4');
var db = mongoose.connection;

// Create our Express application
var app = express();

// Use environment defined port or 4000
var port = process.env.PORT || 4000;

//Allow CORS so that backend and frontend can be put on different servers
var allowCrossDomain = function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	  
	// Intercept OPTIONS method
	if ('OPTIONS' == req.method) {
	  res.sendStatus(200);
	}
	else {
	  next();
	}
};

app.use(allowCrossDomain);

// Use the body-parser package in our application
/*  app.use(bodyParser.urlencoded({
  extended: true
}));  */

app.use(bodyParser.json());

// Allow req to access our database
app.use(function(req,res,next){
    req.db = db;
    next();
});

// All our routes will start with /api
app.use('/api', router);

// Default route
var homeRoute = router.route('/');

// Hello World!
homeRoute.get(function(req, res) {
  res.json({ message: 'Hello World!' });
});

// CREATE A NEW USER
var usersRoute = router.route('/users');

usersRoute.post(function(req, res) {
	
	var user = new User(); 
	var data = req.body; 
	
	// Initialize variables based on data passed in
	user.name = data.name;
	user.email = data.email;
	user.pendingTasks = [];
	user.dateCreated =  new Date();
	
	// Server validation for name and email, send error if either field is blank
	if(user.name === "undefined" || user.email === "undefined" || user.name === undefined || user.email === undefined) {
		return res.status(500).send({ 'message': 'Please fill out all fields with valid characters.', 'data': [] });
	}	
	
	// Try to find a user with specified email, if there is no user with specified email, save user to database
	User.findOne({ 'email': user.email }, function (err, person) {
		if (err) {
			return res.status(500).send({ 'message': 'Please fill out all fields with valid characters.', 'data': [] });
		}
		if (person === null) {
			user.save(function(err) {
				if (err)
					return res.status(500).send({ 'message': 'Failed to save user to the database.', 'data': [] });
				else
					return res.status(201).send({ 'message': 'User successfully created!', 'data': user });
			});
		}
		else 
			return res.status(500).send({ 'message': 'The email provided is already in use!', 'data': []});
	}); 
});

// GET ALL USERS
usersRoute.get(function(req, res) {
	
	// Get all query parameters
	var where = eval("("+req.query.where+")");
	var sort = eval("("+req.query.sort+")");
	var select = eval("("+req.query.select+")");
	var skip = eval("("+req.query.skip+")");
	var limit = eval("("+req.query.limit+")");
	var count = eval("("+req.query.count+")");
	
	// Return count of users that would be returned that meet the specified criteria
	if(count === true) {
		User.count(where, function(err, list) {
			if (err) 
				return res.status(500).send({'message': 'Failed to retrieve users.', 'data': []});
			else
				return res.status(200).send({'message': "OK", 'data': list});
		}).limit(limit).skip(skip).sort(sort);
	}
	// Return all users that meet the specified criteria
	else {
		User.find(where, select, function(err, list) {
			if (err) 
				return res.status(500).send({'message': 'Failed to retrieve users.', 'data': []});
			else
				return res.status(200).send({'message': "OK", 'data': list});
		}).limit(limit).skip(skip).sort(sort);
	}
});

var userDetailsRoute = router.route('/users/:id');

// GET A SINGLE USER
userDetailsRoute.get(function(req, res) {
	
	var id = req.params.id;
	
	// Find user based on specified id, return 404 or user found
	User.findOne({'_id': id }, function(err, person) {
		if (err || person === null) 
			return res.status(404).send({'message': 'User not found.', 'data': []});
		else
			return res.status(200).send({'message': "OK", 'data': person});
	});
});

// UPDATE A USER
userDetailsRoute.put(function(req, res) {
	
	var id = req.params.id;
	var data = req.body; 
	
	if(data.name === "undefined" || data.email === "undefined" || data.name === undefined || data.email === undefined) {
		return res.status(500).send({ 'message': 'Please fill out all fields with valid characters.', 'data': [] });
	}
	
	if(data.pendingTasks === "undefined" || data.pendingTasks === undefined)
		data.pendingTasks = [];
	
	User.update(
		{ '_id': id },
		{ $set: {"email": data.email, "name": data.name, "pendingTasks": data.pendingTasks} }, 
		function(err, person) {
			if(err)
				return res.status(400).send({ 'message': 'User not found.', 'data': [] });
			else {
				User.findOne({'_id': id }, function(err, person) {
					if (err || person === null) 
						return res.status(404).send({'message': 'User not found.', 'data': []});
					else
						return res.status(200).send({'message': "User succesfully updated!", 'data': person});
				});
			}
		}
	);
});

// REMOVE A USER
userDetailsRoute.delete(function(req, res) {
	
	var id = req.params.id;
	
	// Find user based on specified id, return 404 or remove user from database
	User.findOne({'_id': id }, function(err, person) {
		if (err || person === null) 
			return res.status(404).send({'message': 'User not found.', 'data': []});
		else {
			var tasks = person.pendingTasks;
			User.remove({ '_id' : id }, function(err) {
				if(err)
					return res.status(404).send({'message': 'User not found.', 'data': []});
				else
					return res.status(200).send({'message': 'User successfully deleted.', 'data': []});
			});
		}
	});
});

var tasksRoute = router.route('/tasks');

// CREATE A NEW TASK
tasksRoute.post(function(req, res) {
	
	var task = new Task(); 
	var data = req.body; 
	
	// Initialize variables based on data passed in
	task.name = data.name;
	task.description = data.description;
	task.deadline = data.deadline;
	task.completed = false;
	task.assignedUserName = data.assignedUserName;
	task.assignedUser = data.assignedUser;
	task.dateCreated = new Date();
	
	// Server validation for name and deadline, send error if either field is blank
	if(task.name === "undefined" || task.deadline === "undefined" || task.name === undefined || task.deadline === undefined) {
		return res.status(500).send({ 'message': 'Please fill out all required fields with valid characters.', 'data': [] });
	}	
	
	// Set defaults for variables
	if(task.assignedUserName === "" || task.assignedUserName === "undefined" || task.assignedUserName === undefined)
		task.assignedUserName = "unassigned";
	
	if(task.assignedUser === "undefined" || task.assignedUser === undefined)
		task.assignedUser = "";
	
	if(task.description === "undefined" || task.description === undefined)
		task.description = "none";

	task.save(function(err, savedTask) {
		if (err)
			return res.status(500).send({ 'message': 'Failed to save task to the database.', 'data': [] });
		// If task saved successfully, push pending task to specified user's pending tasks
		else
			return res.status(201).send({ 'message': 'Task successfully created!', 'data': task });
	});
});

// GET ALL TASKS
tasksRoute.get(function(req, res) {

	// Get all query parameters
	var where = eval("("+req.query.where+")");
	var sort = eval("("+req.query.sort+")");
	var select = eval("("+req.query.select+")");
	var skip = eval("("+req.query.skip+")");
	var limit = eval("("+req.query.limit+")");
	var count = eval("("+req.query.count+")");
	
	if(limit === undefined || limit === "undefined")
		limit = 100;
	
	// Return count of tasks that would be returned that meet the specified criteria
	if(count === true) {
		Task.count(where, function(err, list) {
			if (err) 
				return res.status(500).send({'message': 'Failed to retrieve tasks.', 'data': []});
			else
				return res.status(200).send({'message': "OK", 'data': list});
		}).limit(limit).skip(skip).sort(sort);
	}
	// Return all tasks that meet the specified criteria
	else {
		Task.find(where, select, function(err, list) {
			if (err) 
				return res.status(500).send({'message': 'Failed to retrieve tasks.', 'data': []});
			else
				return res.status(200).send({'message': "OK", 'data': list});
		}).limit(limit).skip(skip).sort(sort);
	}
});

var taskDetailsRoute = router.route('/tasks/:id');

// GET A SINGLE TASK
taskDetailsRoute.get(function(req, res) {
	
	var id = req.params.id;
	
	// Find task based on specified id, return 404 or task found
	Task.findOne({'_id': id }, function(err, task) {
		if (err || task === null) 
			return res.status(404).send({'message': 'Task not found.', 'data': []});
		else
			return res.status(200).send({'message': "OK", 'data': task});
	});
});

// UPDATE A TASK
taskDetailsRoute.put(function(req, res) {
	
	var id = req.params.id;
	var data = req.body; 
	
	// Server validation for name and deadline, send error if either field is blank
	if(data.name === "undefined" || data.deadline === "undefined" || data.name === undefined || data.deadline === undefined)
		return res.status(500).send({ 'message': 'Please fill out all required fields with valid characters.', 'data': [] });

	// Set defaults for variables
	if(data.assignedUserName === "undefined" || data.assignedUserName == undefined || data.assignedUserName === "")
		data.assignedUserName = "unassigned";
	
	if(data.assignedUser === "undefined" || data.assignedUser === undefined || data.assignedUser === "")
		data.assignedUser = "";
	
	if(data.description === "undefined" || data.description === undefined || data.description === "")
		data.description = "none";
	
	var oldAssignedUser = "";
	
	Task.findOne({'_id': id }, function(err, oldTask) {
		Task.update(
			{ '_id': id },
			{ $set: {"name": data.name, "description": data.description, "deadline": data.deadline, "completed": data.completed, "assignedUser": data.assignedUser, "assignedUserName": data.assignedUserName} }, 
			function(err, person) {
				if(err)
					return res.status(400).send({ 'message': 'User not found.', 'data': [] });
				else {
					Task.findOne({'_id': id }, function(err, newTask) {
						if (err || person === null) 
							return res.status(404).send({'message': 'Task not found.', 'data': []});
						else
							return res.status(200).send({'message': "Task succesfully updated!", 'data': newTask});
					});
				}
			}
		);
	});
});

// REMOVE A TASK
taskDetailsRoute.delete(function(req, res) {
	
	var id = req.params.id;

	Task.findOne({'_id': id }, function(err, task) {
		if (err || task === null) 
			return res.status(404).send({'message': 'Task not found.', 'data': []});
		else {
			var user = task.assignedUser;
			Task.remove({ '_id' : id }, function(err) {
				if(err)
					return res.status(404).send({'message': 'Task not found.', 'data': []});
				// If task is successfuly removed, remove task from user's pending tasks
				else {
						return res.status(200).send({'message': 'Task successfully deleted.', 'data': []});
				}
			});
		}
	});
});

// Start the server
app.listen(port);
console.log('Server running on port ' + port);