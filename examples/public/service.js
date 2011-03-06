var client = new Faye.Client("/bayeux"),
	r      = document.getElementById("r");

// try debug data:
Faye.Logging.logLevel = "debug";
Faye.logger = function(msg) { r.value += msg + "\n"; };


client.addExtension({
	outgoing: function(message, callback) {
		// add auth data to /action/** channels
		if (message.channel === "/meta/subscribe" || message.channel.slice(0, 8) === "/action/") {
			if (!message.ext) { message.ext = {}; }
			// token is defined in user.jade
			message.ext.auth = token;
		}
		callback(message);
	}
});

client.subscribe("/action/" + user + "/res", function(message) {
	var res = "R: " + JSON.stringify(message) + "\n";
	r.value += res;
	console.log(res);
});

function makeAction(action, params)
{
	client.publish("/action/" + user, {
		action: action,
		params: params,
		rid   : Math.floor(Math.random()*100)
	});
}
