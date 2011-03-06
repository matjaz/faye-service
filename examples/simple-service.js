var Faye        = require("faye"),
	express     = require("express"),
	FS          = require("../lib/index"),
	FayeService = new FS.Service(),
	fayeServer  = new Faye.NodeAdapter(),
	ClientError = FS.ClientError,
	app         = express.createServer(
		express.staticProvider(__dirname + "/public")
	);

var users = {
	test: {
		token: "token",
		name:  "test"
	}
};

FayeService.setAuth(function(message, callback) {
	var parts  = (message.subscription || message.channel || "").split("/"),
		token  = message.ext && message.ext.auth,
		user   = users[parts[2]];
	
	callback(user && user.token === token ? user : null);
});

FayeService.addServices({
	echo: function(params, callback)
	{
		callback(params.text);
	},
	
	sayName: function(params, callback)
	{
		callback(params.user.name);
	},
	
	theAnswer: function(params, callback)
	{
		if (params !== 42)
		{
			throw new ClientError("Wrong answer");
		}
		callback("Yes! 42!");
	}
});

FayeService.attach(fayeServer);
fayeServer.attach(app);


app.set("view engine", "jade");
app.set("view options", {
	layout: false
});

app.get("/", function(req, res) {
  res.render("root");
});

app.get("/user/:userId", function(req, res, next) {
	var user = users[req.params.userId];
	if (user)
	{
		res.render("user", {
			locals: user
		});
	}
	else
	{
		next();
	}
});

app.listen(8080);
console.log("Express server listening on port %d", app.address().port);
