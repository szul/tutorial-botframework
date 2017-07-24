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

var intents = new builder.IntentDialog();

intents.matches(/departs|departing/i, [
    (sess, args, next) => {
        if(sess.userData.arrival === undefined) {
            sess.beginDialog("/arrival");
        }
        else {
            next(args)
        }
    },
    (sess, result) => {
        console.log(result);
        //parse input, search route, and store results
    }
]);

intents.matches(/arrive|arrival/i, [
    (sess, args, next) => {
        if(sess.userData.departure === undefined) {
            sess.beginDialog("/departure");
        }
        else {
            next(args)
        }
    },
    (sess, result) => {
        console.log(result);
        //parse input, search route, and store results
    }
]);

intents.onDefault([
    (sess, args, next) => {
        if(!sess.userData.name) {
            sess.beginDialog("/profile");
        }
        else {
            next()
        }
    },
    (sess, result) => {
        sess.send(`Hello, ${sess.userData.name}! What may I help you?`);
    }
]);

bot.dialog("/", intents);

bot.dialog("/departure", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "What is the three letter code for the departure city?");
    },
    (sess, result) => {
        sess.userData.departure = result.response;
        sess.endDialog();
    }
]);

bot.dialog("/arrival", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "What is the three letter code for the arrival city?");
    },
    (sess, result) => {
        sess.userData.departure = result.response;
        sess.endDialog();
    }
]);

bot.dialog("/results", [
    (sess, args, next) => {
        var route: Route = sess.userData.route;
        if(route && route.toCode === undefined) {
            sess.replaceDialog("/noresults", { entry: "dialog" });
        }
        else {
            sess.userData.lastRoute = route;
            builder.Prompts.choice(sess, `So you want to check the status of the train leaving ${route.from} and arriving at ${route.to}, correct?`, [
                  "Yes"
                , "No"
            ]);
        }
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

bot.dialog("/profile", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "Hello, user! What is your name");
    },
    (sess, result) => {
        sess.userData.name = result.response;
        sess.endDialog();
    }
]);

bot.dialog("/noresults", [
    (sess, args, next) => {
        if(args && args.entry && args.entry === "dialog") {
            builder.Prompts.choice(sess, "Sorry. No results were found. :( Would you like to try again?", [
                "Yes"
                , "No"
            ]);
        }
        else {
            sess.send("Oh hey! You're back! Let's start this over.");
            sess.replaceDialog("/");
        }
    },
    (sess, result) => {
        if(result.response.entity === "Yes") {
            sess.replaceDialog("/");
        }
        else {
            sess.send("Okay, bye!");
        }
    }
]);
