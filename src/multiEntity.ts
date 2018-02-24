/// <reference path="../node_modules/botbuilder/lib/botbuilder.d.ts" />
/// <reference path="../node_modules/@types/restify/index.d.ts" />
/// <reference path="../base/dist/types.d.ts" />
/// <reference path="../amtrak/dist/amtrak.d.ts" />

import * as builder from "botbuilder";
//import * as azure from "botbuilder-azure";
import * as restify from "restify";
import * as types from "../base/dist/types";
import * as amtrak from "../amtrak/dist/amtrak";

var azure = require("botbuilder-azure");
require("dotenv-extended").load();

const TABLENAME = process.env.TABLENAME;
const STORAGENAME = process.env.STORAGENAME;
const STORAGEKEY = process.env.STORAGEKEY;

function setSingleEntity(sess: builder.Session, args: any): void {
    sess.dialogData.toFrom = builder.EntityRecognizer.findEntity(args.intent.entities, "to-from");
    sess.dialogData.arriveDepart = builder.EntityRecognizer.findEntity(args.intent.entities, "arrive-depart");
    sess.dialogData.geo =  builder.EntityRecognizer.findEntity(args.intent.entities, "builtin.geography.city");
    sess.dialogData.stateCode = builder.EntityRecognizer.findEntity(args.intent.entities, "state-code");
}

function setMultipleEntities(sess: builder.Session, args: any): void {

}

function normalizeAndStoreData(sess: builder.Session, args: any, isMulti: boolean = false): void {
    isMulti ? setMultipleEntities(sess, args) : setSingleEntity(sess, args);
}

function hasRouteComponents(sess: builder.Session, routeType: string): boolean {
    return (sess.userData[routeType] !== undefined)
}

function getCity(sess: builder.Session): string {
    return (sess.dialogData.geo != null) ? sess.dialogData.geo.entity : null;
}

function processRoute(sess: builder.Session, routeType: string, routeTypeValue?: string): void {
    let input: string = getCity(sess);
    let route: types.Route = amtrak.searchTrainRoute(routeType, routeTypeValue, input);
    if(!route || route.toCode === undefined) {
        sess.replaceDialog("/noresults", { entry: "dialog" });
    }
    else {
        sess.userData.route = route;
        sess.replaceDialog("/results");
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

var tableClient = new azure.AzureTableClient(TABLENAME, STORAGENAME, STORAGEKEY);
var tableStorage = new azure.AzureBotStorage({ gzipData: false }, tableClient);

var bot = new builder.UniversalBot(conn).set("storage", tableStorage);
bot.recognizer(new builder.LuisRecognizer(process.env.LUIS_MODEL_URL));
server.post("/api/messages", conn.listen());

bot.dialog("/multiMatch", (sess, args) => {
    normalizeAndStoreData(sess, args, true);
    //processRoute(sess, types.FULL);
}).triggerAction({
    matches: "composite"
});

bot.dialog("/departMatch", [
    (sess, args, next) => {
        normalizeAndStoreData(sess, args);
        if(!hasRouteComponents(sess, types.ARRIVAL)) {
            sess.beginDialog("/arrival");
        }
        else {
            next();
        }
    },
    (sess, result) => {
        processRoute(sess, types.DEPARTURE, sess.userData.departure);
    }
]).triggerAction({
    matches: "departure status"
});

bot.dialog("/arriveMatch", [
    (sess, args, next) => {
        normalizeAndStoreData(sess, args);
        if(!hasRouteComponents(sess, types.DEPARTURE)) {
            sess.beginDialog("/departure");
        }
        else {
            next();
        }
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
