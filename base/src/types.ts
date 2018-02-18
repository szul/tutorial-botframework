export interface Route {
      departure: Date
    , arrival: Date
    , train: string
    , from: string
    , fromCode: string
    , to: string
    , toCode: string
    , status: string
}

export const ARRIVAL = "to";
export const DEPARTURE = "from";
export const FULL = "full";
