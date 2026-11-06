import { getElseSetDefault } from "../../../lib/get-else-set-default";


export function setEventResultedIn(initiator, result) {
    result.initiator = initiator;
    getElseSetDefault(initiator, "resultedIn", []).push(result);
}


export function setEventResultedInMultiple(initiator, results) {
    results.forEach((event) => { event.initiator = initiator; });
    getElseSetDefault(initiator, "resultedIn", []).push(...results);
}

export function setEventBeforeEventOf(beforeEvent, afterEvent) {
    afterEvent.beforeEvent = beforeEvent;
    getElseSetDefault(beforeEvent, "beforeEventOf", []).push(afterEvent);
}


export function setEventBeforeEventOfMultiple(beforeEvent, afterEvents) {
    afterEvents.forEach((event) => { event.beforeEvent = beforeEvent; });
    getElseSetDefault(beforeEvent, "beforeEventOf", []).push(...afterEvents);
}

export function setSnapshotProperty(event, name, value) {
    const snapshot = getElseSetDefault(event, "snapshot", {});
    snapshot[name] = value;
}