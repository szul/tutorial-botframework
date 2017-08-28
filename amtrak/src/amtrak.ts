/// <reference path="../../node_modules/@types/cheerio/index.d.ts" />
/// <reference path="../../node_modules/@types/node/index.d.ts" />
/// <reference path="../../base/dist/types.d.ts" />

import * as fs from "fs";
import * as cheerio from "cheerio";
import * as types from "../../base/dist/types";

const codes: string = fs.readFileSync("codes.xml", "utf-8");
const routes: string = fs.readFileSync("amtrak.xml", "utf-8");
const xml: CheerioStatic = cheerio.load(routes);

export function searchTrainRoute(routeType: string, routeTypeCode: string, term: string, byCity: boolean = false): types.Route {
    var route = null;
    var routes = xml(routeType).each((idx: number, elem: CheerioElement) => {
        try {
            if(route == null && xml(elem).text().toLowerCase().indexOf(term.toLowerCase()) != -1) {
                let node = xml(elem).parent();
                let rt: types.Route = getTrainRoute(
                      (routeTypeCode === types.ARRIVAL) ? routeTypeCode : node.attr("to")
                    , (routeTypeCode === types.DEPARTURE) ? routeTypeCode : node.attr("from")
                    , byCity
                );
                if(rt != null && rt.toCode !== undefined) {
                    route = rt;
                }
            }
        }
        catch(e) {
            console.log(`An error has occurred: ${e}`);
        }
    });
    return route;
}

export function getTrainRoute(to: string, from: string, byCity: boolean = false): types.Route {
    try {
        var routeSelector = `route[to='${to}'][from='${from}']`;
        var route = xml(routeSelector).first();
        var r: types.Route = {
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
