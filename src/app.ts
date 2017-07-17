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

bot.dialog("/", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "Hello! What is the three letter code for the departure city?");
    },
    (sess, result) => {
        sess.userData.departure = result.response;
        builder.Prompts.text(sess, "Okay, great! What is the three letter code for the arrival city?");
    },
    (sess, result) => {
        sess.userData.arrival = result.response;
        var route: Route = amtrak.getTrainRoute(sess.userData.arrival, sess.userData.departure);
        sess.userData.lastRoute = route;
        builder.Prompts.choice(sess, `So you want to check the status of the train leaving ${route.from} and arriving at ${route.to}, correct?`, [
              "Yes"
            , "No"
        ]);
    },
    (sess, result) => {
        if(result.response.entity === "Yes") {
            let route = sess.userData.lastRoute;
            sess.send(`The current status of the train from ${route.from} to ${route.to} is ${route.status}`);
        }
        else {
            sess.replaceDialog("/");
        }
    }
]);
