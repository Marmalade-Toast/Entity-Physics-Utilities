import { system, world } from "@minecraft/server";


export function pprint(obj, repr = false, memo = null) {
    memo = memo ?? new Set();

    if (obj instanceof Array) {
        if (memo.has(obj)) {
            return "§d( ... )§r";
        }
        memo.add(obj);
        return "[ " + obj.map((value) => pprint(value, repr = true, memo)).join(", ") + " ]";
    }
    if (obj === null) {
        return "§dnull§f";
    }
    switch (typeof obj) {
        case "string":
            return repr ? "§a\"" + obj + "\"§f" : "§a" + obj + "§f";
        
        case "number":
            return "§w" + obj + "§f";
        
        case "bigint":
            return "§w" + obj + " §b(BigInt)§r";
        
        case "boolean":
            return "§c" + obj + "§f";
        
        case "function":
            return "§b" + obj + "§f";

        case "symbol":
            return "§a" + obj.toString() + "§f";
        
        case "undefined":
            return "§d§o" + obj + "§r§f";
    }

    if (memo.has(obj)) {
        return "§d( ... )§r";
    }
    memo.add(obj);

    return "{ "
        + Object.keys(obj)
          .map((key) => pprint(key, repr = false, memo) + ": " + pprint(obj[key], repr = true, memo))
          .join(", ")
        + " }";
}


export function log(...objs) {
    world.sendMessage(`§9[${system.currentTick}]§f -> ` + objs.map((obj) => pprint(obj)).join(" "));
}