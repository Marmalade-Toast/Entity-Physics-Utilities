import { system } from "@minecraft/server";
import { getElseSetDefault, getElseSetDefaultMap } from "../../lib/get-else-set-default";


class EventPool {
    #tick
    #allEventsByType
    #allEvents
    constructor(tick) {
        this.#tick = tick;
        this.#allEventsByType = new Map();
        this.#allEvents = [];
    }

    get tick() {
        return this.#tick;
    }

    getEventsBySignal(eventSignal) {
        return this.#allEventsByType.get(eventSignal) ?? [];
    }

    getAllEvents() {
        return [...this.#allEvents];
    }

    pushEvent(eventSignal, event) {
        const tickEventsGroup = getElseSetDefaultMap(this.#allEventsByType, eventSignal, []);
        tickEventsGroup.push(event);
        this.#allEvents.push(event);
    }
}


export class EventProcessor {
    #requiredEventSignals
    #eventSignalSubscriptionCallbacks
    #eventQueue
    
    #registeredModules

    constructor() {
        this.#requiredEventSignals = new Map();
        this.#eventSignalSubscriptionCallbacks = new Map();
        this.#eventQueue = {};

        this.#registeredModules = [];
    }

    get requiredEventSignals() {
        return new Set(this.#requiredEventSignals);
    }

    requestRequireEventSignal(who, eventSignal) {
        const currentSubscribers = getElseSetDefaultMap(this.#requiredEventSignals, eventSignal, new Set());

        if (!currentSubscribers.size) {
            this.#subscribeToEventSignal(eventSignal);
        }
        currentSubscribers.add(who);
    }

    #subscribeToEventSignal(eventSignal) {
        const callback = (event) => this.#pushEvent(eventSignal, event);
        eventSignal.subscribe(callback);
        this.#eventSignalSubscriptionCallbacks.set(eventSignal, callback);
    }

    requestReleaseEventSignal(who, eventSignal) {
        const currentSubscribers = this.#requiredEventSignals.get(eventSignal);
        if (currentSubscribers === undefined) return;

        currentSubscribers.delete(who);
        if (!currentSubscribers.size) {
            this.#unsubscribeFromEventSignal(eventSignal);
            this.#requiredEventSignals.delete(eventSignal);

        }
    }

    #unsubscribeFromEventSignal(eventSignal) {
        const callback = this.#eventSignalSubscriptionCallbacks.get(eventSignal);
        if (callback === undefined) return;
        eventSignal.unsubscribe(callback);
        this.#eventSignalSubscriptionCallbacks.delete(eventSignal);
    }

    #pushEvent(eventSignal, event) {
        const timestamp = system.currentTick;
        const tickEventPool = getElseSetDefault(this.#eventQueue, timestamp, new EventPool(timestamp));

        event.timestamp = timestamp;
        tickEventPool.pushEvent(eventSignal, event);
    }

    registerModule(module) {
        module.declareRequirements(this);
        this.#registeredModules.push(module);
    }

    #processTickEvents(timestamp) {
        const events = this.#eventQueue[timestamp];
        if (events === undefined) return;
        this.#registeredModules.forEach(
            (module) => module.processTickEvents(events)
        );
        delete this.#eventQueue[timestamp];
    }

    *processCompletedTickEventsIterator() {
        while (true) {
            const timestamps = Object.keys(this.#eventQueue)
                               .filter(timestamp => timestamp < system.currentTick);
            
            if (!timestamps.length) yield;
            else {
                for (const timestamp of timestamps) {
                    this.#processTickEvents(timestamp);
                    yield;
                }
            }
        }
    }
}


export class EventProcessorModule {
    constructor() { }

    declareRequirements(eventProcessor) {
        // Declare module requirements here.
    }

    releaseRequirements(eventProcessor) {
        // Release module requirements here.
    }

    processTickEvents(events) {
        // Process and augment events here.
    }
}