import { Direction, EntityComponentTypes, system, world } from "@minecraft/server";
import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";

import { joinOnKeyEqualOneToOne, joinOnKeyEqualOneToN } from "../../../lib/inner-join";
import { log } from "../../../lib/debug/logging";
import { getElseSetDefault } from "../../../lib/get-else-set-default";
import { EventProcessorModule } from "../event-processor";
import { setEventBeforeEventOf, setEventResultedInMultiple, setSnapshotProperty } from "./module-utils";
import { ExplosionSimulator } from "../../simulators/explosion";
import { add, mul } from "../../vector3-utils/math";
import { UnitDirectionVector } from "../../vector3-utils/directions";


function isWindChargeLike(entity) {
    return (
        entity.typeId == "minecraft:wind_charge_projectile"
        || entity.typeId == "minecraft:breeze_wind_charge_projectile"
    );
}


function isProjectile(entity) {
    return entity.hasComponent(EntityComponentTypes.Projectile);
}


export class ExplosionModule extends EventProcessorModule {
    #processExplosionBeforeEventCallback

    constructor() {
        super();
        this.#processExplosionBeforeEventCallback = ((event) => ExplosionModule.#processExplosionBeforeEvent(event));
    }

    declareRequirements(eventProcessor) {
        eventProcessor.requestRequireEventSignal(this, world.beforeEvents.explosion);

        eventProcessor.requestRequireEventSignal(this, world.afterEvents.explosion);

        world.beforeEvents.explosion.subscribe(this.#processExplosionBeforeEventCallback);
    }

    releaseRequirements(eventProcessor) {
        eventProcessor.requestReleaseEventSignal(this, world.beforeEvents.explosion);

        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.explosion);

        world.beforeEvents.explosion.unsubscribe(this.#processExplosionBeforeEventCallback);
    }

    static #processExplosionBeforeEvent(event) {
        const source = event.source;
        if (source === undefined || !source.isValid) return;
        const dimension = event.dimension;
        const sourceLocation = source.location;
        const sourceVelocity = source.getVelocity();
        const sourceAABB = source.getAABB();
        setSnapshotProperty(
            event,
            "sourceEntity",
            {
                location: sourceLocation,
                velocity: sourceVelocity,
                aabb: source.getAABB()
            }
        );

        // Speculate about where the explosion origin could be before all data
        // becomes available. Once the event has been linked, it becomes
        // possible to reject incorrect guesses.
        
        // This is necessary as a projectile hit or destructive explosion could
        // modify nearby blocks, rendering it impossible to recover the state
        // used to determine if EBEO has occurred.
        
        const explosionLocationGuesses = {};

        if (source.typeId === "minecraft:tnt") {
            explosionLocationGuesses.default = {
                original: add(sourceLocation, {x: 0, y: 0.06125, z: 0}),
                afterOffset: ExplosionSimulator.simulateEBEO(dimension, add(sourceLocation, {x: 0, y: 0.06125, z: 0}), sourceVelocity)
            };
        }

        else {
            explosionLocationGuesses.default = {
                original: sourceLocation,
                afterOffset: ExplosionSimulator.simulateEBEO(dimension, sourceLocation, sourceVelocity)
            };
        }

        if (!isProjectile(source)) {
            explosionLocationGuesses.AABBCentre = {
                original: sourceAABB.center,
                afterOffset: ExplosionSimulator.simulateEBEO(dimension, sourceAABB.center, sourceVelocity)
            };
        }

        // Wind charge explosion offsets
        if (isWindChargeLike(source)) {
            explosionLocationGuesses.windChargeExplosionCentres = {};
            for (const direction in Direction) {
                const explosionLocation = ExplosionSimulator.simulateEBEO(
                    dimension,
                    add(sourceLocation, mul(UnitDirectionVector[direction], 0.25)),
                    sourceVelocity
                );
                explosionLocationGuesses.windChargeExplosionCentres[direction] = {
                    original: sourceAABB.center,
                    afterOffset: explosionLocation
                };

                // log(explosionLocation)
                // const shape = new DebugBox(explosionLocation);
                // shape.bound = {x: 0.1, y: 0.1, z: 0.1};
                // shape.timeLeft = 10;
                // debugDrawer.addShape(shape);
            }
        }
        setSnapshotProperty(
            event,
            "explosionLocationGuesses",
            explosionLocationGuesses
        );
    }

    static #explosionJoin_ExplosionEventKey(event) {
        const sourceEntity = event.source;
        if (sourceEntity === undefined) return null;
    
        const key = `E:${sourceEntity.id}`;
        return key;
    }

    processTickEvents(events) {
        // Associate before/after events to gain additional information
        const explosionBeforeEvents = events.getEventsBySignal(world.beforeEvents.explosion);
        const explosionAfterEvents = events.getEventsBySignal(world.afterEvents.explosion);
        const explosionBeforeAfterPairs = joinOnKeyEqualOneToOne(
            explosionBeforeEvents,
            explosionAfterEvents,
            ExplosionModule.#explosionJoin_ExplosionEventKey,
            ExplosionModule.#explosionJoin_ExplosionEventKey
        );
        for (const pair of explosionBeforeAfterPairs) {
            const beforeEvent = pair[0];
            const afterEvent = pair[1];
            setEventBeforeEventOf(beforeEvent, afterEvent);
            log("Event", afterEvent, "is afterEvent of", beforeEvent);
        }
    }
}