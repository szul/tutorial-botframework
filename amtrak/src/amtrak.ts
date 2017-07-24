/// <reference path="../../node_modules/@types/cheerio/index.d.ts" />
/// <reference path="../../node_modules/@types/node/index.d.ts" />
/// <reference path="../../base/dist/types.d.ts" />

import * as fs from "fs";
import * as cheerio from "cheerio";

const codes: string = fs.readFileSync("codes.xml", "utf-8");
const routes: string = fs.readFileSync("amtrak.xml", "utf-8");
const xml: CheerioStatic = cheerio.load(routes);

export function searchTrainRoute(routeType: string, term: string): Route {
    var route = null;
    var routes = xml(routeType.toLowerCase()).each((idx: number, elem: CheerioElement) => {
        if(route != null && xml(elem).text().indexOf(term) != -1) {
            let node = xml(elem).parent();
            route = getTrainRoute(node.attr("to"), node.attr("from"));
        }
    });
    return route;
}

export function getTrainRoute(to: string, from: string): Route {
    try {
        var route = xml(`route[to='${to}'][from='${from}']`).first();
        var r: Route = {
              departure: new Date(route.find("departure").text())
            , arrival: new Date(route.find("arrival").text())
            , train: route.find("train").text()
            , from: route.find("from").text()
            , fromCode: route.attr("from")
            , to: route.find("to").text()
            , toCode: route.attr("to")
            , status: route.find("status").text()
        };
        return r;
    }
    catch(e) {
        console.log(`An error has occurred ${e}`);
        return null;
    }
}
