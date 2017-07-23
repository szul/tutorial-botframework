/// <reference path="../node_modules/botbuilder/lib/botbuilder.d.ts" />
/// <reference path="../node_modules/@types/restify/index.d.ts" />
/// <reference path="../amtrak/dist/amtrak.d.ts" />

import * as builder from "botbuilder";
import * as restify from "restify";
import * as amtrak from "../amtrak/dist/amtrak";

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`Listening... ${server.name}... ${server.url}`);
});

var conn = new builder.ChatConnector({
      appId: process.env.MICROSOFT_APP_ID
    , appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(conn);
server.post("/api/messages", conn.listen());

