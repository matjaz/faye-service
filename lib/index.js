var util = require("util");

function ClientError(msg)
{
	this.name    = this.type = "ClientError";
	this.code    = 400;
	this.message = msg;
	Error.call(this, msg);
}
util.inherits(ClientError, Error);

ClientError.prototype.toString = function() {
	return this.code + '::' + this.message;
};
exports.ClientError = ClientError;

exports.Service = Faye.Class({
	
	incoming: function(message, callback) {
		var parts = (message.subscription || message.channel || "").split("/"),
			that,
			data;
		
		// match /action/** channels
		if (parts[1] === "action") {
			// subscription to /action/*/res channels
			if (message.channel === "/meta/subscribe" && parts[3] === "res") {
				this._auth(message, function(user) {
					if (!user) {
						message.error = Faye.Error.channelForbidden(message.subscription);
					}
					callback(message);
				});
				return;
			}
			
			// allow local client
			if (message.clientId === this._client._clientId) {
				callback(message);
				return;
			}
			
			// deny access to /action/*/** from remote clients
			if (parts.length > 3) {
				message.error = Faye.Error.channelForbidden(message.subscription);
				callback(message);
				return;
			}
			
			// else
			data = message.data;
			if (data && data.action) {
				that = this;
				this._auth(message, function(user) {
					var params, action;
					if (user) {
						action = that._services[data.action];
						if (action) {
							try {
								params = data.params || {};
								console.log(data.action + "(" + util.inspect(params) + ")");
								params.user = user;
								action(params, function(result) {
									callback(message);
									delete params.user;
									that._client.publish(message.channel + "/res", {
										data: result,
										rid:  data.rid || 0
									});
								});
								return;
							} catch (e) {
								if (e instanceof ClientError) {
									message.error = e.toString();
								} else {
									console.log(e.toString(), e.stack);
									message.error = "500::Server error";
								}
							}
						} else {
							message.error = "404:" + data.action + ":Unknown action";
						}
					} else {
						message.error = Faye.Error.channelUnknown(message.channel);
					}
					callback(message);
				});
				return;
			} else {
				message.error = "400::Missing action parameter";
			}
		}
		callback(message);
	},
	
	_auth: function(message, callback) {
		callback(true);
	},
	
	_services: {},
	
	sendToClient: function(userId, data) {
		this._client.publish("/action/" + userId + "/res", {data: data});
	},
	
	setAuth: function(a) {
		this._auth = a;
	},
	
	addServices: function(s) {
		Faye.extend(this._services, s);
	},
	
	attach: function(fayeServer) {
		this._client = fayeServer.getClient();
		fayeServer.addExtension(this);
	},
	
	detach: function(fayeServer) {
		fayeServer.removeExtension(this);
		this._client = null;
	}
});
