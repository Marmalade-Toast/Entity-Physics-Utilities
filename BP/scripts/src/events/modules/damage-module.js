import { EntityComponentTypes, EntityDamageCause, system, world } from "@minecraft/server";

import { joinOnKeyEqualOneToN, joinOnKeyEqualOneToOne } from "../../../lib/inner-join";
import { EventProcessorModule } from "../event-processor";
import { setEventBeforeEventOf, setEventResultedIn, setEventResultedInMultiple, setSnapshotProperty } from "./module-utils";
import { log } from "../../../lib/debug/logging";
import { getElseSetDefault } from "../../../lib/get-else-set-default";


export class DamageModule extends EventProcessorModule {
    #processEntityHurtBeforeEventCallback

    constructor() {
        super();
        this.#processEntityHurtBeforeEventCallback = (event) => DamageModule.#processEntityHurtBeforeEvent(event);
    }

    declareRequirements(eventProcessor) {
        eventProcessor.requestRequireEventSignal(this, world.beforeEvents.entityHurt);
        eventProcessor.requestRequireEventSignal(this, world.afterEvents.entityDie);

        eventProcessor.requestRequireEventSignal(this, world.afterEvents.entityHurt);
        eventProcessor.requestRequireEventSignal(this, world.afterEvents.entityHitEntity);
        eventProcessor.requestRequireEventSignal(this, world.afterEvents.explosion);
        eventProcessor.requestRequireEventSignal(this, world.afterEvents.projectileHitEntity);
        eventProcessor.requestRequireEventSignal(this, world.afterEvents.effectAdd);

        world.beforeEvents.entityHurt.subscribe(this.#processEntityHurtBeforeEventCallback);
    }

    releaseRequirements(eventProcessor) {
        eventProcessor.requestReleaseEventSignal(this, world.beforeEvents.entityHurt);
        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.entityDie);

        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.entityHurt);
        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.entityHitEntity);
        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.explosion);
        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.projectileHitEntity);
        eventProcessor.requestReleaseEventSignal(this, world.afterEvents.effectAdd);

        world.beforeEvents.entityHurt.unsubscribe(this.#processEntityHurtBeforeEventCallback);
    }

    static #hurtJoin_HurtEventKey(event) {
        const hurtEntity = event.hurtEntity;
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const damagingEntity = damageSource.damagingEntity;
        const damagingProjectile = damageSource.damagingProjectile;
    
        const key = `H:${hurtEntity.id}C:${cause}E:${damagingEntity?.id}P:${damagingProjectile?.id}`
        return key;
    }
    
    static #hurtDieJoin_HurtEventKey(event) {
        // Damage must be fatal in order to kill the entity
        if (!event.beforeEvent?.snapshot?.isFatal) return null;
    
        const hurtEntity = event.hurtEntity;
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const damagingEntity = damageSource.damagingEntity;
        const damagingProjectile = damageSource.damagingProjectile;
    
        const key = `D:${hurtEntity.id}C:${cause}E:${damagingEntity?.id}P:${damagingProjectile?.id}`
        return key;
    }
    
    static #hurtDieJoin_DieEventKey(event) {
        const deadEntity = event.deadEntity;
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const damagingEntity = damageSource.damagingEntity;
        const damagingProjectile = damageSource.damagingProjectile;
    
        const key = `D:${deadEntity.id}C:${cause}E:${damagingEntity?.id}P:${damagingProjectile?.id}`
        return key;
    }
    
    static #hitHurtJoin_HitKey(event) {
        const damagingEntity = event.damagingEntity;
        const hitEntity = event.hitEntity;
    
        const key = `A:${damagingEntity.id}D:${hitEntity.id}`;
        return key;
    }
    
    static #hitHurtJoin_HurtKey(event) {
        const hitEntity = event.hurtEntity;
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const damagingEntity = damageSource.damagingEntity;
        if (damagingEntity === undefined || cause !== EntityDamageCause.entityAttack) return null;
    
        const key = `A:${damagingEntity.id}D:${hitEntity.id}`;
        return key;
    }
    
    static #explosionHurtJoin_ExplosionKey(event) {
        const sourceEntity = event.source;
        if (sourceEntity === undefined) return null;
    
        const key = `E:${sourceEntity.id}T:E`;
        return key;
    }
    
    static #explosionHurtJoin_HurtKey(event) {
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const damagingEntity = damageSource?.damagingEntity;
        if (damagingEntity === undefined || cause !== EntityDamageCause.entityExplosion) return null;
    
        const key = `E:${damagingEntity.id}T:E`;
        return key;
    }
    
    static #projectileHitHurtJoin_ProjectileHitKey(event) {
        const hitEntity = event.getEntityHit()?.entity;
        const projectile = event.projectile;
        
        const key = `H:${hitEntity.id}P:${projectile.id}`;
        return key;
    }
    
    static #projectileHitHurtJoin_HurtKey(event) {
        const hitEntity = event.hurtEntity;
        const damageSource = event.damageSource;
        const cause = damageSource.cause;
        const projectile = damageSource?.damagingProjectile;
        if (projectile === undefined || cause !== EntityDamageCause.projectile) return null;
    
        const key = `H:${hitEntity.id}P:${projectile.id}`;
        return key;
    }
    
    static #effectAddHurtJoin_EffectAddKey(event) {
        const effectType = event.effect.typeId;
        // Only instant damage can apply damage instantly.
        // Poison and other lasting effects do not apply the first damage instantly.
        if (effectType !== "minecraft:instant_damage") return null;
        const entity = event.entity;
    
        const key = `E:${entity.id}`;
        return key;
    }
    
    static #effectAddHurtJoin_HurtKey(event) {
        const hurtEntity = event.hurtEntity;
        const cause = event.damageSource.cause;
        if (cause !== EntityDamageCause.magic) return null;
    
        const key = `E:${hurtEntity.id}`;
        return key;
    }

    static #processEntityHurtBeforeEvent(event) {
        const hurtEntity = event.hurtEntity;
        if (!hurtEntity.isValid) return;
        const remainingHealth = event.hurtEntity?.getComponent?.(EntityComponentTypes.Health)?.currentValue;
        if (remainingHealth === undefined) return;
        const isFatal = remainingHealth <= 0;
        setSnapshotProperty(event, "isFatal", isFatal);
    }

    processTickEvents(events) {
        // Associate before/after events to gain additional information
        const entityHurtBeforeEvents = events.getEventsBySignal(world.beforeEvents.entityHurt);
        const entityHurtAfterEvents = events.getEventsBySignal(world.afterEvents.entityHurt);
        const entityHurtPairs = joinOnKeyEqualOneToOne(
            entityHurtBeforeEvents,
            entityHurtAfterEvents,
            DamageModule.#hurtJoin_HurtEventKey,
            DamageModule.#hurtJoin_HurtEventKey
        );
        for (const pair of entityHurtPairs) {
            const beforeEvent = pair[0];
            const afterEvent = pair[1];
            setEventBeforeEventOf(beforeEvent, afterEvent);
        }

        // ENTITY DEATH
        const entityDieAfterEvents = events.getEventsBySignal(world.afterEvents.entityDie);
        const entityHurtDiePairs = joinOnKeyEqualOneToOne(
            entityHurtAfterEvents,
            entityDieAfterEvents,
            DamageModule.#hurtDieJoin_HurtEventKey,
            DamageModule.#hurtDieJoin_DieEventKey
        );
        for (const pair of entityHurtDiePairs) {
            const hurtEvent = pair[0];
            const dieEvent = pair[1];
            setEventResultedIn(hurtEvent, dieEvent);
        }

        // DAMAGE CAUSES
        // Entity melee attacks
        const entityHitEntityAfterEvents = events.getEventsBySignal(world.afterEvents.entityHitEntity);
        const entityHitHurtPairs = joinOnKeyEqualOneToOne(
            entityHitEntityAfterEvents,
            entityHurtAfterEvents,
            DamageModule.#hitHurtJoin_HitKey,
            DamageModule.#hitHurtJoin_HurtKey
        );
        for (const pair of entityHitHurtPairs) {
            const hitEvent = pair[0];
            const hurtEvent = pair[1];
            setEventResultedIn(hitEvent, hurtEvent);
        }
        // Explosion
        const explosionAfterEvents = events.getEventsBySignal(world.afterEvents.explosion);
        const entityExplodeHurtPairs = joinOnKeyEqualOneToN(
            explosionAfterEvents,
            entityHurtAfterEvents,
            DamageModule.#explosionHurtJoin_ExplosionKey,
            DamageModule.#explosionHurtJoin_HurtKey
        );
        for (const pair of entityExplodeHurtPairs) {
            const explosionEvent = pair[0];
            const hurtEvents = pair[1];
            setEventResultedInMultiple(explosionEvent, hurtEvents);
        }
        // Projectile hit
        const projectileHitEntityAfterEvents = events.getEventsBySignal(world.afterEvents.projectileHitEntity);
        const projectileHitHurtPairs = joinOnKeyEqualOneToOne(
            projectileHitEntityAfterEvents,
            entityHurtAfterEvents,
            DamageModule.#projectileHitHurtJoin_ProjectileHitKey,
            DamageModule.#projectileHitHurtJoin_HurtKey
        );
        for (const pair of projectileHitHurtPairs) {
            const projectileHitEntityEvent = pair[0];
            const hurtEvent = pair[1];
            setEventResultedIn(projectileHitEntityEvent, hurtEvent);
        }
        // Instant damage effect
        // This event is undetectable by the Script API when applied during the
        // entity system update due to https://bugs.mojang.com/browse/MCPE/issues/MCPE-244182.
        const effectAddAfterEvents = events.getEventsBySignal(this, world.afterEvents.effectAdd);
        const effectAddHurtPairs = joinOnKeyEqualOneToOne(
            effectAddAfterEvents,
            entityHurtAfterEvents,
            DamageModule.#effectAddHurtJoin_EffectAddKey,
            DamageModule.#effectAddHurtJoin_HurtKey
        );
        for (const pair of effectAddHurtPairs) {
            const effectAddEvent = pair[0];
            const hurtEvent = pair[1];
            setEventResultedIn(effectAddEvent, hurtEvent);
        }
    }
}
