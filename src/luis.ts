/// <reference path="../node_modules/botbuilder/lib/botbuilder.d.ts" />
/// <reference path="../node_modules/@types/restify/index.d.ts" />
/// <reference path="../base/dist/types.d.ts" />
/// <reference path="../amtrak/dist/amtrak.d.ts" />

import * as builder from "botbuilder";
import * as restify from "restify";
import * as types from "../base/dist/types";
import * as amtrak from "../amtrak/dist/amtrak";

require("dotenv-extended").load();

function hasRouteComponents(sess: builder.Session, args: any, routeType: string): boolean {
    sess.dialogData.input = args.intent.matched.input;
    sess.dialogData.index = args.intent.matched.index;
    if(sess.userData[routeType] !== undefined) {
        return true;
    }
    else {
        return false;
    }
}

function processRoute(sess: builder.Session, routeType: string, routeTypeValue: string): void {
    if(sess.dialogData.input && sess.dialogData.index) {
        let input: string = sess.dialogData.input;
        let partial = input.substr(sess.dialogData.index).replace("?", "");
        if(partial.indexOf(" ") != -1) {
            let parts = partial.split(" ");
            partial = partial.split(" ")[parts.length - 1];
        }
        let route: types.Route = amtrak.searchTrainRoute(routeType, routeTypeValue, partial);
        if(!route || route.toCode === undefined) {
            sess.replaceDialog("/noresults", { entry: "dialog" });
        }
        else {
            sess.userData.route = route;
            sess.replaceDialog("/results");
        }
    }
}

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`Listening... ${server.name}... ${server.url}`);
});

var conn = new builder.ChatConnector({
      appId: process.env.MICROSOFT_APP_ID
    , appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(conn);
bot.recognizer(new builder.LuisRecognizer(process.env.LUIS_MODEL_URL));
server.post("/api/messages", conn.listen());

bot.dialog("/multiMatch", (sess, args) => {
    console.log(args);
}).triggerAction({
    matches: "composite"
});

bot.dialog("/departMatch", [
    (sess, args, next) => {
        console.log(args);
        /*
        if(!hasRouteComponents(sess, args, types.ARRIVAL)) {
            sess.beginDialog("/arrival");
        }
        else {
            next();
        }
        */
    },
    (sess, result) => {
        processRoute(sess, types.DEPARTURE, sess.userData.departure);
    }
]).triggerAction({
    matches: "departure status"
});

bot.dialog("/arriveMatch", [
    (sess, args, next) => {
        console.log(args);
        /*
        if(!hasRouteComponents(sess, args, types.DEPARTURE)) {
            sess.beginDialog("/departure");
        }
        else {
            next();
        }
        */
    },
    (sess, result) => {
        processRoute(sess, types.ARRIVAL, sess.userData.arrival);
    }
]).triggerAction({
    matches: "arrival status"
});

bot.dialog("/", [
    (sess, args, next) => {
        sess.userData.arrival = undefined;
        sess.userData.departure = undefined;
        if(!sess.userData.name) {
            sess.beginDialog("/profile");
        }
        else {
            next();
        }
    },
    (sess, result) => {
        sess.send(`Hello ${sess.userData.name}! What may I help you with?`);
    }
]);

bot.dialog("/departure", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "What is your departure city?");
    },
    (sess, result) => {
        sess.userData.departure = result.reponse;
        sess.endDialog();
    }
]);

bot.dialog("/arrival", [
    (sess, args, next) => {
        builder.Prompts.text(sess, "What is your arrival city?");
    },
    (sess, result) => {
        sess.userData.arrival = result.reponse;
        sess.endDialog();
    }
]);

bot.dialog("/results", [
    (sess, args, next) => {
        var route: types.Route = sess.userData.route;
        sess.userData.lastRoute = route;
        sess.userData.route = null;
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
