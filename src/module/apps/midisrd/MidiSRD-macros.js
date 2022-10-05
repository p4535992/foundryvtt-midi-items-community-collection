import CONSTANTS from "../../constants.js";
import { warn } from "../../lib/lib.js";
export class MidiMacros {
    static targets(args) {
        const lastArg = args[args.length - 1];
        let tactor;
        let ttoken = undefined;
        if (lastArg.tokenId) {
            ttoken = canvas.tokens?.get(lastArg.tokenId);
            tactor = ttoken.actor;
        }
        else {
            tactor = game.actors?.get(lastArg.actorId);
        }
        return { actor: tactor, token: ttoken, lArgs: lastArg };
    }
    /**
     *
     * @param {Object} templateData
     * @param {Actor5e} actor
     */
    static templateCreation(templateData, actor) {
        const doc = new CONFIG.MeasuredTemplate.documentClass(templateData, { parent: canvas.scene });
        //@ts-ignore
        const template = new game.dnd5e.canvas.AbilityTemplate(doc);
        template.actorSheet = actor.sheet;
        template.drawPreview();
    }
    /**
     *
     * @param {String} flagName
     * @param {Actor5e} actor
     */
    static async deleteTemplates(flagName, actor) {
        const removeTemplates = (canvas.templates?.placeables.filter((i) => i.data.flags["midi-items-community"]?.[flagName]?.ActorId === actor.id));
        const templateArray = removeTemplates.map(function (w) {
            return w.id;
        });
        if (removeTemplates)
            await canvas.scene?.deleteEmbeddedDocuments("MeasuredTemplate", templateArray);
    }
    static async deleteTokens(flagName, actor) {
        const removeTokens = (canvas.tokens?.placeables.filter((i) => i.data.flags["midi-items-community"]?.[flagName]?.ActorId === actor.id)) || [];
        const tokenArray = removeTokens.map(function (w) {
            return w.id;
        });
        if (removeTokens)
            await canvas.scene?.deleteEmbeddedDocuments("Token", tokenArray);
    }
    /**
     *
     * @param {String} flagName
     * @param {Actor5e} actor
     */
    static async deleteItems(flagName, actor) {
        const items = actor.items.filter((i) => i.data.flags["midi-items-community"]?.[flagName] === actor.id);
        const itemArray = items.map(function (w) {
            return w.data._id;
        });
        if (itemArray.length > 0)
            await actor.deleteEmbeddedDocuments("Item", [itemArray]);
    }
    /**
     *
     * @param {String} name
     * @param {Actor5e} actor
     */
    static async addDfred(name, actor) {
        await game.dfreds.effectInterface.addEffect({ effectName: name, uuid: actor.uuid });
    }
    /**
     *
     * @param {String} name
     * @param {Actor5e} actor
     */
    static async hasEffectAppliedDfred(name, actor) {
        return await game.dfreds.effectInterface.hasEffectApplied({ effectName: name, uuid: actor.uuid });
    }
    /**
     *
     * @param {String} name
     * @param {Actor5e} actor
     */
    static async removeDfred(name, actor) {
        await game.dfreds.effectInterface.removeEffect({ effectName: name, uuid: actor.uuid });
    }
    /**
     *
     * @param {Token} token Token to move
     * @param {Number} maxRange Range in ft
     * @param {String} name Name of the Effect
     * @param {Boolean} animate Animate move, default false
     */
    static async moveToken(token, maxRange, name, animate = false) {
        const snap = token.data.width / 2 === 0 ? 1 : -1;
        const { x, y } = await this.warpgateCrosshairs(token, maxRange, name, token.data.img, token.data, snap);
        const pos = canvas.grid?.getSnappedPosition(x - 5, y - 5, 1);
        await token.document.update(pos, { animate: animate });
    }
    /**
     *
     * @param {Token} source Source of range distance (usually)
     * @param {Number} maxRange range of crosshairs
     * @param {String} name Name to use
     * @param {String} icon Crosshairs Icon
     * @param {Object} tokenData {height; width}
     * @param {Number} snap snap position, 2: half grid intersections, 1: on grid intersections, 0: no snap, -1: grid centers, -2: half grid centers
     * @returns
     */
    static async warpgateCrosshairs(source, maxRange, name, icon, tokenData, snap) {
        const sourceCenter = source.center;
        let cachedDistance = 0;
        const checkDistance = async (crosshairs) => {
            while (crosshairs.inFlight) {
                //wait for initial render
                await warpgate.wait(100);
                const ray = new Ray(sourceCenter, crosshairs);
                const distance = canvas.grid?.measureDistances([{ ray }], { gridSpaces: true })[0];
                //only update if the distance has changed
                if (cachedDistance !== distance) {
                    cachedDistance = distance;
                    if (distance > maxRange) {
                        crosshairs.icon = "icons/svg/hazard.svg";
                    }
                    else {
                        crosshairs.icon = icon;
                    }
                    crosshairs.draw();
                    crosshairs.label = `${distance}/${maxRange} ft`;
                }
            }
        };
        const callbacks = {
            show: checkDistance,
        };
        const location = await warpgate.crosshairs.show({ size: tokenData.width, icon: source.data.img, label: "0 ft.", interval: snap }, callbacks);
        console.log(location);
        if (location.cancelled)
            return false;
        if (cachedDistance > maxRange) {
            ui.notifications.error(`${name} has a maximum range of ${maxRange} ft.`);
            return false;
        }
        return location;
    }
    static async aid(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const buf = (parseInt(args[1]) - 1) * 5;
        const curHP = actor.system.attributes.hp.value;
        const curMax = actor.system.attributes.hp.max;
        if (args[0] === "on") {
            await actor.update({ "system.attributes.hp.value": curHP + buf });
        }
        else if (curHP > curMax) {
            await actor.update({ "system.attributes.hp.value": curMax });
        }
    }
    static async alterSelf(args) {
        //DAE Item Macro
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEitem = actor.items.find((i) => i.name === `Unarmed Strike`); // find unarmed strike attack
        if (args[0] === "on") {
            new Dialog({
                title: "Are you using Natural Weapons",
                content: "",
                buttons: {
                    one: {
                        label: "Yes",
                        callback: async () => {
                            if (!DAEitem) {
                                await ChatMessage.create({ content: "No unarmed strike found" }); // exit out if no unarmed strike
                                return;
                            }
                            const copy_item = duplicate(DAEitem);
                            await DAE.setFlag(actor, "AlterSelfSpell", copy_item.system.damage.parts[0][0]); //set flag of previous value
                            copy_item.system.damage.parts[0][0] = "1d6 +@mod"; //replace with new value
                            await await actor.updateEmbeddedDocuments("Item", [copy_item]); //update item
                            await ChatMessage.create({ content: "Unarmed strike is altered" });
                        },
                    },
                    two: {
                        label: "No",
                        callback: async () => await ChatMessage.create({ content: `Unarmed strike not altered` }),
                    },
                },
            }).render(true);
        }
        if (args[0] === "off") {
            const damage = DAE.getFlag(actor, "AlterSelfSpell"); // find flag with previous values
            if (!DAEitem)
                return;
            const copy_item = duplicate(DAEitem);
            copy_item.system.damage.parts[0][0] = damage; //replace with old value
            await await actor.updateEmbeddedDocuments("Item", [copy_item]); //update item
            await DAE.unsetFlag(actor, "world", "AlterSelfSpell"); //remove flag
            await ChatMessage.create({ content: `Alter Self expired, unarmed strike returned` });
        }
    }
    static async animateDead(args) {
        if (!game.modules.get("warpgate")?.active) {
            ui.notifications.error("Please enable the Warp Gate module");
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
            await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
        }
        const cycles = 1 + (lArgs.powerLevel - 3) * 2;
        const buttonData = {
            buttons: [
                {
                    label: "Zombie",
                    value: {
                        token: { name: "Zombie" },
                        actor: { name: "Zombie" },
                    },
                },
                {
                    label: "Skeleton",
                    value: {
                        actor: { name: "Skeleton" },
                        token: { name: "Skeleton" },
                    },
                },
            ],
            title: "Which type of Undead?",
        };
        const pack = game.packs.get("dnd5e.monsters");
        await pack.getIndex();
        for (let i = 0; i < cycles; i++) {
            const dialog = await warpgate.buttonDialog(buttonData);
            const index = pack.index.find((i) => i.name === dialog.actor.name);
            const compendium = await pack.getDocument(index._id);
            const updates = {
                token: compendium.data.token,
                actor: compendium.toObject(),
            };
            await warpgate.spawn(CONSTANTS.MODULE_NAME, updates, {}, { controllingActor: actor });
        }
    }
    static async arcaneEye(args, texture) {
        if (!game.modules.get("warpgate")?.active)
            ui.notifications.error("Please enable the Warp Gate module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
                await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
            }
            const sourceItem = await fromUuid(lArgs.origin);
            texture = texture || sourceItem.img;
            const updates = {
                token: {
                    name: "Arcane Eye",
                    img: texture,
                    dimVision: 30,
                    scale: 0.4,
                    flags: { "midi-items-community": { ArcaneEye: { ActorId: actor.id } } },
                },
                actor: { name: "Arcane Eye" },
            };
            const { x, y } = await MidiMacros.warpgateCrosshairs(token, 30, "Arcane Eye", texture, {}, -1);
            //@ts-ignore
            await warpgate.spawnAt({ x, y }, CONSTANTS.MODULE_NAME, updates, { controllingActor: actor });
        }
        if (args[0] === "off") {
            await MidiMacros.deleteTokens("ArcaneEye", actor);
        }
    }
    static async arcaneHand(args, texture) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            if (!game.modules.get("warpgate")?.active)
                ui.notifications.error("Please enable the Warp Gate module");
            if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
                await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
            }
            const sourceItem = await fromUuid(lArgs.origin);
            texture = texture || sourceItem.img;
            //@ts-ignore
            const summonerDc = actor.system.attributes.spelldc;
            const summonerAttack = summonerDc - 8;
            const summonerMod = getProperty(actor, `system.abilities.${getProperty(actor, "system.attributes.spellcasting")}.mod`);
            let fistScale = "";
            let graspScale = "";
            if (lArgs.powerLevel - 5 > 0) {
                fistScale = ` + ${(lArgs.powerLevel - 5) * 2}d8[upcast]`;
            }
            if (lArgs.powerLevel - 5 > 0) {
                graspScale = ` + ${(lArgs.powerLevel - 5) * 2}d6[upcast]`;
            }
            const updates = {
                token: {
                    name: "Arcane Hand",
                    img: texture,
                    height: 2,
                    width: 2,
                    flags: { "midi-items-community": { ArcaneHand: { ActorId: actor.id } } },
                },
                actor: {
                    name: "Arcane Hand",
                    //@ts-ignore
                    "system.attributes.hp": {
                        //@ts-ignore
                        value: actor.system.attributes.hp.max,
                        //@ts-ignore
                        max: actor.system.attributes.hp.max,
                    },
                },
                embedded: {
                    Item: {
                        "Clenched Fist": {
                            "system.attackBonus": `- @mod - @prof + ${summonerAttack}`,
                            "system.damage.parts": [[`4d8 ${fistScale}`, "force"]],
                            type: "weapon",
                        },
                        "Grasping Hand": {
                            "system.damage.parts": [[`2d6 ${graspScale} + ${summonerMod}`, "bludgeoning"]],
                            type: "weapon",
                        },
                    },
                },
            };
            const { x, y } = await MidiMacros.warpgateCrosshairs(token, 120, "Arcane Hand", texture, { height: 2, width: 2 }, 1);
            //@ts-ignore
            await warpgate.spawnAt({ x, y }, CONSTANTS.MODULE_NAME, updates, { controllingActor: actor });
        }
        if (args[0] === "off") {
            await MidiMacros.deleteTokens("ArcaneHand", actor);
        }
    }
    static async arcaneSword(args, texture) {
        //DAE Macro Execute, Effect Value = "Macro Name" @target
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const casterToken = canvas.tokens?.get(lArgs.tokenId) || token;
        const DAEitem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEitem.data.save;
        /**
         * Create Arcane Sword item in inventory
         */
        if (args[0] === "on") {
            const image = DAEitem.img;
            const range = canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                {
                    t: "circle",
                    user: game.user?.id,
                    x: casterToken.x + canvas.grid?.size / 2,
                    y: casterToken.y + canvas.grid?.size / 2,
                    direction: 0,
                    distance: 60,
                    borderColor: "#FF0000",
                    flags: { "midi-items-community": { ArcaneSwordRange: { ActorId: actor.id } } },
                    //fillColor: "#FF3366",
                },
            ]);
            range?.then((result) => {
                const templateData = {
                    t: "rect",
                    user: game.user?.id,
                    distance: 7,
                    direction: 45,
                    texture: texture || "",
                    x: 0,
                    y: 0,
                    flags: { "midi-items-community": { ArcaneSword: { ActorId: actor.id } } },
                    fillColor: game.user?.color,
                };
                //Hooks.once("createMeasuredTemplate", deleteTemplates);
                Hooks.once("createMeasuredTemplate", templateData);
                MidiMacros.templateCreation(templateData, actor);
                //MidiMacros.deleteTemplates("ArcaneSwordRange", data)
                MidiMacros.deleteTemplates("ArcaneSwordRange", saveData);
            });
            await actor.createEmbeddedDocuments("Item", [
                {
                    name: "Summoned Arcane Sword",
                    type: "weapon",
                    data: {
                        quantity: 1,
                        activation: {
                            type: "action",
                            cost: 1,
                            condition: "",
                        },
                        target: {
                            value: 1,
                            type: "creature",
                        },
                        range: {
                            value: 5,
                            long: null,
                            units: "",
                        },
                        ability: DAEitem.data.ability,
                        actionType: "msak",
                        attackBonus: "0",
                        chatFlavor: "",
                        critical: null,
                        damage: {
                            parts: [[`3d10`, "force"]],
                            versatile: "",
                        },
                        weaponType: "simpleM",
                        proficient: true,
                    },
                    flags: {
                        "midi-items-community": {
                            ArcaneSword: actor.id,
                        },
                    },
                    img: image,
                },
            ]);
            ui.notifications.notify("Arcane Sword created in your inventory");
        }
        // Delete Arcane Sword
        if (args[0] === "off") {
            //MidiMacros.deleteItems("ArcaneSword", data)
            //MidiMacros.deleteTemplates("ArcaneSwordRange", data)
            MidiMacros.deleteItems("ArcaneSword", saveData);
            MidiMacros.deleteTemplates("ArcaneSwordRange", saveData);
        }
    }
    static async banishment(args) {
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        //DAE Macro, Effect Value = @target
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (token) {
            if (args[0] === "on") {
                await token.document.update({ hidden: true }); // hide targeted token
                await ChatMessage.create({ content: token.name + "  was banished" });
            }
            if (args[0] === "off") {
                await token.document.update({ hidden: false }); // unhide token
                await ChatMessage.create({ content: actor.name + "  returned" });
            }
        }
        else {
            warn(`No token is founded for the 'banishment' macro`, true);
        }
    }
    static async blindness(args) {
        if (!game.modules.get("dfreds-convenient-effects")?.active) {
            ui.notifications.error("Please enable the CE module");
            return;
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            new Dialog({
                title: "Choose an Effect",
                content: "<p>You must choose either 'Blindness', or 'Deafness'</p>",
                buttons: {
                    one: {
                        label: "Blindness",
                        callback: async () => {
                            //@ts-ignore
                            await DAE.setFlag(actor, "DAEBlind", "blind");
                            await MidiMacros.addDfred("Blinded", actor);
                        },
                    },
                    two: {
                        label: "Deafness",
                        callback: async () => {
                            //@ts-ignore
                            await DAE.setFlag(actor, "DAEBlind", "deaf");
                            await MidiMacros.addDfred("Deafened", actor);
                        },
                    },
                },
                close: (html) => {
                    // Do nothing
                },
            }).render(true);
        }
        if (args[0] === "off") {
            //@ts-ignore
            const flag = DAE.getFlag(actor, "DAEBlind");
            if (flag === "blind") {
                await MidiMacros.removeDfred("Blinded", actor);
            }
            else if (flag === "deaf") {
                await MidiMacros.removeDfred("Deafened", actor);
            }
            //@ts-ignore
            await DAE.unsetFlag(actor, "DAEBlind");
        }
    }
    static async callLightning(args, texture) {
        //DAE Macro no arguments passed
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEitem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEitem.data.save;
        /**
         * Create Call Lightning Bolt item in inventory
         */
        if (args[0] === "on") {
            const templateData = {
                t: "circle",
                user: game.user?.id,
                distance: 60,
                direction: 0,
                x: 0,
                y: 0,
                texture: texture || "",
                flags: { "midi-items-community": { CallLighting: { ActorId: actor.id } } },
                fillColor: game.user?.color,
            };
            MidiMacros.templateCreation(templateData, actor);
            await actor.createEmbeddedDocuments("Item", [
                {
                    name: "Call Lightning - bolt",
                    type: "spell",
                    data: {
                        description: {
                            value: '<p><span style="color: #191813; font-size: 13px;">A bolt of lightning flashes down from the cloud to that point. Each creature within 5 feet of that point must make a Dexterity saving throw. A creature takes 3d10 lightning damage on a failed save, or half as much damage on a successful one.</span></p>',
                        },
                        activation: {
                            type: "action",
                        },
                        target: {
                            value: 5,
                            width: null,
                            units: "ft",
                            type: "radius",
                        },
                        ability: "",
                        actionType: "save",
                        damage: {
                            parts: [[`${DAEitem.data.level}d10`, "lightning"]],
                            versatile: "",
                        },
                        formula: "",
                        save: {
                            ability: "dex",
                            dc: 16,
                            scaling: "spell",
                        },
                        level: 0,
                        school: "abj",
                        preparation: {
                            mode: "prepared",
                            prepared: false,
                        },
                        scaling: {
                            mode: "none",
                            formula: "",
                        },
                    },
                    flags: { "midi-items-community": { CallLighting: { ActorId: actor.id } } },
                    img: "systems/dnd5e/icons/spells/lighting-sky-2.jpg",
                    effects: [],
                },
            ]);
        }
        // Delete Flame Blade
        if (args[0] === "off") {
            MidiMacros.deleteItems("CallLighting", actor);
            MidiMacros.deleteTemplates("CallLighting", actor);
        }
    }
    static async confusion(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "each") {
            const confusionRoll = await new Roll("1d10").evaluate({ async: false }).total;
            let content;
            switch (confusionRoll) {
                case 1:
                    content =
                        "The creature uses all its movement to move in a random direction. To determine the direction, roll a  [[d8]] and assign a direction to each die face. The creature doesn't take an action this turn.";
                    break;
                case 2:
                    content = "	The creature doesn't move or take actions this turn.";
                    break;
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    content =
                        "The creature uses its action to make a melee attack against a randomly determined creature within its reach. If there is no creature within its reach, the creature does nothing this turn.";
                    break;
                case 8:
                case 9:
                case 10:
                    content = "The creature can act and move normally.";
                    break;
            }
            await ChatMessage.create({
                content: `Confusion roll for ${actor.name} is ${confusionRoll}:<br> ` + content,
            });
        }
    }
    static async contagion(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const dc = args[1];
        if (args[0] === "on") {
            // Save the hook data for later access.
            //@ts-ignore
            await DAE.setFlag(actor, "ContagionSpell", {
                count: 0,
            });
        }
        if (args[0] === "off") {
            // When off, clean up hooks and flags.
            //@ts-ignore
            await DAE.unsetFlag(actor, "ContagionSpell");
        }
        if (args[0] === "each") {
            const contagion = lArgs.efData;
            if (contagion.label === "Contagion")
                Contagion();
        }
        /**
         * Execute contagion effects, update flag counts or remove effect
         *
         * @param {Actor5e} combatant Current combatant to test against
         * @param {Number} save Target DC for save
         */
        async function Contagion() {
            //@ts-ignore
            const flag = DAE.getFlag(actor, "ContagionSpell");
            //@ts-ignore
            const flavor = `${CONFIG.DND5E.abilities["con"]} DC${dc} ${DAEItem?.name || ""}`;
            //@ts-ignore
            const saveRoll = (await actor.rollAbilitySave("con", { flavor })).total;
            if (saveRoll < dc) {
                if (flag.count === 2) {
                    await ChatMessage.create({ content: `Contagion on ${actor.name} is complete` });
                    ContagionMessage();
                    return;
                }
                else {
                    const contagionCount = flag.count + 1;
                    //@ts-ignore
                    await DAE.setFlag(actor, "ContagionSpell", {
                        count: contagionCount,
                    });
                    console.log(`Contagion increased to ${contagionCount}`);
                }
            }
            else if (saveRoll >= dc) {
                await actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.effectId]);
            }
        }
        /**
         * Generates the GM client dialog for selecting final Effect, updates target effect with name, icon and new DAE effects.
         */
        async function ContagionMessage() {
            new Dialog({
                title: "Contagion options",
                content: "<p>Select the effect</p>",
                buttons: {
                    one: {
                        label: "Blinding Sickness",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.wis",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.save.wis",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                icon: "modules/dfreds-convenient-effects/images/blinded.svg",
                                label: "Blinding Sickness",
                                _id: lArgs.effectId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                    two: {
                        label: "Filth Fever",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.attack.mwak",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.attack.rwak",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.str",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.save.str",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                label: "Filth Fever",
                                _id: lArgs.effectId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                    three: {
                        label: "Flesh Rot",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.cha",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "data.traits.dv.all",
                                        mode: 0,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                icon: "systems/dnd5e/icons/skills/blood_09.jpg",
                                label: "Flesh Rot",
                                _id: lArgs.effectId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                    four: {
                        label: "Mindfire",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.int",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.save.int",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                icon: "icons/svg/daze.svg",
                                label: "Mindfire",
                                _id: lArgs.effectId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                    five: {
                        label: "Seizure",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.attack.mwak",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.attack.rwak",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.dex",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.save.dex",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                icon: "icons/svg/paralysis.svg",
                                label: "Seizure",
                                _id: lArgs.effectId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                    six: {
                        label: "Slimy Doom",
                        callback: async () => {
                            const data = {
                                changes: [
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.check.con",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                    {
                                        key: "flags.midi-qol.disadvantage.ability.save.con",
                                        mode: 5,
                                        priority: 20,
                                        value: "1",
                                    },
                                ],
                                icon: "systems/dnd5e/icons/skills/blood_05.jpg",
                                label: "Slimy Doom",
                                _id: lArgs.effecId,
                            };
                            await actor.updateEmbeddedDocuments("ActiveEffect", [data]);
                        },
                    },
                },
            }).render(true);
        }
    }
    static async createUndead(args) {
        if (!game.modules.get("warpgate")?.active) {
            ui.notifications.error("Please enable the Warp Gate module");
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
            await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
        }
        const spelllevel = lArgs.powerLevel;
        const buttonData = {
            buttons: [
                {
                    label: "Ghouls",
                    value: {
                        token: { name: "Ghoul" },
                        actor: { name: "Ghoul" },
                        cycles: spelllevel - 3,
                    },
                },
            ],
            title: "Which type of Undead?",
        };
        if (spelllevel > 7)
            buttonData.buttons.push({
                label: "Wights",
                value: {
                    actor: { name: "Wight" },
                    token: { name: "Wight" },
                    cycles: spelllevel - 6,
                },
            }, {
                label: "Ghasts",
                value: {
                    actor: { name: "Ghast" },
                    token: { name: "Ghast" },
                    cycles: spelllevel - 6,
                },
            });
        if (spelllevel > 8)
            buttonData.buttons.push({
                label: "Mummies",
                value: {
                    actor: { name: "Mummy" },
                    token: { name: "Mummy" },
                    cycles: 2,
                },
            });
        const pack = game.packs.get("dnd5e.monsters");
        await pack.getIndex();
        //@ts-ignore
        const dialog = await warpgate.buttonDialog(buttonData);
        const index = pack.index.find((i) => i.name === dialog.actor.name);
        const compendium = await pack.getDocument(index._id);
        const updates = {
            token: compendium.data.token,
            actor: compendium.toObject(),
        };
        //@ts-ignore
        await warpgate.spawn(CONSTANTS.MODULE_NAME, updates, {}, { controllingActor: actor, duplicates: dialog.cycles });
    }
    static async darkness(args) {
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            const templateData = {
                t: "circle",
                user: game.user?.id,
                distance: 15,
                direction: 0,
                x: 0,
                y: 0,
                fillColor: game.user?.color,
                flags: { "midi-items-community": { Darkness: { ActorId: actor.id } } },
            };
            Hooks.once("createMeasuredTemplate", async (template) => {
                const radius = canvas.grid?.size *
                    (template.data.distance / canvas.grid?.grid?.options.dimensions?.distance);
                MidiMacros.circleWall(actor, template.data.x, template.data.y, radius);
                await canvas.scene?.deleteEmbeddedDocuments("MeasuredTemplate", [template.id]);
            });
            MidiMacros.templateCreation(templateData, actor);
            // async function circleWall(cx, cy, radius) {
            //     const data = [];
            //     const step = 30;
            //     for (let i = step; i <= 360; i += step) {
            //         const theta0 = Math.toRadians(i - step);
            //         const theta1 = Math.toRadians(i);
            //         const lastX = Math.floor(radius * Math.cos(theta0) + cx);
            //         const lastY = Math.floor(radius * Math.sin(theta0) + cy);
            //         const newX = Math.floor(radius * Math.cos(theta1) + cx);
            //         const newY = Math.floor(radius * Math.sin(theta1) + cy);
            //         data.push({
            //             c: [lastX, lastY, newX, newY],
            //             move: CONST.WALL_MOVEMENT_TYPES.NONE,
            //             sense: CONST.WALL_SENSE_TYPES.NORMAL,
            //             dir: CONST.WALL_DIRECTIONS.BOTH,
            //             door: CONST.WALL_DOOR_TYPES.NONE,
            //             ds: CONST.WALL_DOOR_STATES.CLOSED,
            //             flags: { "midi-items-community": { Darkness: { ActorId: actor.id } } }
            //         });
            //     }
            //     await canvas.scene.createEmbeddedDocuments("Wall", data)
            // }
        }
        if (args[0] === "off") {
            MidiMacros.removeWalls(actor);
        }
    }
    static async removeWalls(actor) {
        const darkWalls = canvas.walls?.placeables.filter((w) => w.data.flags["midi-items-community"]?.Darkness?.ActorId === actor.id);
        const wallArray = darkWalls.map(function (w) {
            return w.data._id;
        });
        //@ts-ignore
        await canvas.scene?.deleteEmbeddedDocuments("Wall", wallArray);
    }
    static async circleWall(actor, cx, cy, radius) {
        const data = [];
        const step = 30;
        for (let i = step; i <= 360; i += step) {
            const theta0 = Math.toRadians(i - step);
            const theta1 = Math.toRadians(i);
            const lastX = Math.floor(radius * Math.cos(theta0) + cx);
            const lastY = Math.floor(radius * Math.sin(theta0) + cy);
            const newX = Math.floor(radius * Math.cos(theta1) + cx);
            const newY = Math.floor(radius * Math.sin(theta1) + cy);
            data.push({
                c: [lastX, lastY, newX, newY],
                move: CONST.WALL_MOVEMENT_TYPES.NONE,
                sense: CONST.WALL_SENSE_TYPES.NORMAL,
                dir: CONST.WALL_DIRECTIONS.BOTH,
                door: CONST.WALL_DOOR_TYPES.NONE,
                ds: CONST.WALL_DOOR_STATES.CLOSED,
                flags: { "midi-items-community": { Darkness: { ActorId: actor.id } } },
            });
        }
        await canvas.scene?.createEmbeddedDocuments("Wall", data);
    }
    static async divineWord(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        async function DivineWordApply(actor, targetHp) {
            if (targetHp <= 20) {
                await actor.update({ "system.attributes.hp.value": 0 });
            }
            else {
                if (targetHp <= 30) {
                    //if (!hasStunned) {
                    if (!(await MidiMacros.hasEffectAppliedDfred("Stunned", actor))) {
                        await MidiMacros.addDfred("Stunned", actor);
                    }
                    //@ts-ignore
                    game.Gametime.doIn({ hours: 1 }, async () => {
                        await MidiMacros.removeDfred("Stunned", actor);
                    });
                }
                if (targetHp <= 40) {
                    //if (!hasBlinded) {
                    if (!(await MidiMacros.hasEffectAppliedDfred("Blinded", actor))) {
                        await MidiMacros.addDfred("Blinded", actor);
                    }
                    //@ts-ignore
                    game.Gametime.doIn({ hours: 1 }, async () => {
                        await MidiMacros.removeDfred("Blinded", actor);
                    });
                }
                if (targetHp <= 50) {
                    //if (!hasDeafened) {
                    if (!(await MidiMacros.hasEffectAppliedDfred("Deafened", actor))) {
                        await MidiMacros.addDfred("Deafened", actor);
                    }
                    //@ts-ignore
                    game.Gametime.doIn({ hours: 1 }, async () => {
                        await MidiMacros.removeDfred("Deafened", actor);
                    });
                }
            }
        }
        if (args[0] === "on") {
            //@ts-ignore
            DivineWordApply(actor, token.actor.system.attributes.hp.value);
        }
    }
    static async enhanceAbility(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            new Dialog({
                title: "Choose enhance ability effect for " + actor.name,
                content: "",
                buttons: {
                    one: {
                        label: "Bear's Endurance",
                        callback: async () => {
                            const formula = `2d6`;
                            const amount = (await new Roll(formula).roll())?.total;
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "bear",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.save.con",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                            await ChatMessage.create({ content: `${actor.name} gains ${amount} temp Hp` });
                            await actor.update({ "system.attributes.hp.temp": amount });
                        },
                    },
                    two: {
                        label: "Bull's Strength",
                        callback: async () => {
                            await ChatMessage.create({ content: `${actor.name}'s encumberance is doubled` });
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "bull",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.check.str",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                            await actor.setFlag("dnd5e", "powerfulBuild", true);
                        },
                    },
                    three: {
                        label: "Cat's Grace",
                        callback: async () => {
                            await ChatMessage.create({
                                content: `${actor.name} doesn't take damage from falling 20 feet or less if it isn't incapacitated.`,
                            });
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "cat",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.check.dex",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                        },
                    },
                    four: {
                        label: "Eagle's Splendor",
                        callback: async () => {
                            await ChatMessage.create({ content: `${actor.name} has advantage on Charisma checks` });
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "eagle",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.check.cha",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                        },
                    },
                    five: {
                        label: "Fox's Cunning",
                        callback: async () => {
                            await ChatMessage.create({ content: `${actor.name} has advantage on Intelligence checks` });
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "fox",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.check.int",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                        },
                    },
                    six: {
                        label: "Owl's Wisdom",
                        callback: async () => {
                            await ChatMessage.create({ content: `${actor.name} has advantage on Wisdom checks` });
                            //@ts-ignore
                            await DAE.setFlag(actor, "enhanceAbility", {
                                name: "owl",
                            });
                            const effect = actor.effects.find((i) => i.data.label === "Enhance Ability");
                            const changes = effect.data.changes;
                            changes[1] = {
                                key: "flags.midi-qol.advantage.ability.check.wis",
                                mode: 0,
                                priority: 20,
                                value: `1`,
                            };
                            await effect.update({ changes });
                        },
                    },
                },
            }).render(true);
        }
        if (args[0] === "off") {
            //@ts-ignore
            const flag = DAE.getFlag(actor, "enhanceAbility");
            if (flag.name === "bull") {
                actor.unsetFlag("dnd5e", "powerfulBuild");
            }
            //@ts-ignore
            await DAE.unsetFlag(actor, "enhanceAbility");
            await ChatMessage.create({ content: "Enhance Ability has expired" });
        }
    }
    static async enlargeReduce(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (token) {
            const originalSize = token.data.width;
            //@ts-ignore
            const mwak = actor.system.bonuses.mwak.damage;
            if (args[0] === "on") {
                new Dialog({
                    title: "Enlarge or Reduce",
                    content: "",
                    buttons: {
                        one: {
                            label: "Enlarge",
                            callback: async () => {
                                const bonus = mwak + "+ 1d4";
                                const enlarge = originalSize + 1;
                                await actor.update({ "data.bonuses.mwak.damage": bonus });
                                await token.document.update({ width: enlarge, height: enlarge });
                                //@ts-ignore
                                await DAE.setFlag(actor, "enlageReduceSpell", {
                                    size: originalSize,
                                    ogMwak: mwak,
                                });
                                await ChatMessage.create({ content: `${token.name} is enlarged` });
                            },
                        },
                        two: {
                            label: "Reduce",
                            callback: async () => {
                                const bonus = mwak + " -1d4";
                                const size = originalSize;
                                const newSize = size > 1 ? size - 1 : size - 0.3;
                                await actor.update({ "data.bonuses.mwak.damage": bonus });
                                await token.document.update({ width: newSize, height: newSize });
                                //@ts-ignore
                                await DAE.setFlag(actor, "enlageReduceSpell", {
                                    size: originalSize,
                                    ogMwak: mwak,
                                });
                                await ChatMessage.create({ content: `${token.name} is reduced` });
                            },
                        },
                    },
                }).render(true);
            }
            if (args[0] === "off") {
                //@ts-ignore
                const flag = DAE.getFlag(actor, "enlageReduceSpell");
                await actor.update({ "data.bonuses.mwak.damage": flag.ogMwak });
                await token.document.update({ width: flag.size, height: flag.size });
                //@ts-ignore
                await DAE.unsetFlag(actor, "enlageReduceSpell");
                await ChatMessage.create({ content: `${token.name} is returned to normal size` });
            }
        }
        else {
            warn(`No token is been found for the 'enlargeReduce' macro`, true);
        }
    }
    static async eyebite(args) {
        if (!game.modules.get("dfreds-convenient-effects")?.active) {
            ui.notifications.error("Please enable the CE module");
            return;
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        // TODO pass this on the macro ?
        const DC = 10;
        function EyebiteDialog() {
            new Dialog({
                title: "Eyebite options",
                content: "<p>Target a token and select the effect</p>",
                buttons: {
                    one: {
                        label: "Asleep",
                        callback: async () => {
                            for (const t of game.user?.targets) {
                                //@ts-ignore
                                const flavor = `${CONFIG.DND5E.abilities["wis"]} DC${DC} ${DAEItem?.name || ""}`;
                                //@ts-ignore
                                const saveRoll = (await actor.rollAbilitySave("wis", { flavor, fastFoward: true }))
                                    .total;
                                if (DC && saveRoll < DC) {
                                    await ChatMessage.create({
                                        content: `${t.name} failed the save with a ${saveRoll}`,
                                    });
                                    await MidiMacros.addDfred("Unconscious", actor);
                                }
                                else {
                                    await ChatMessage.create({
                                        content: `${t.name} passed the save with a ${saveRoll}`,
                                    });
                                }
                            }
                        },
                    },
                    two: {
                        label: "Panicked",
                        callback: async () => {
                            for (const t of game.user?.targets) {
                                //@ts-ignore
                                const flavor = `${CONFIG.DND5E.abilities["wis"]} DC${DC} ${DAEItem?.name || ""}`;
                                //@ts-ignore
                                const saveRoll = (await actor.rollAbilitySave("wis", { flavor, fastFoward: true }))
                                    .total;
                                if (saveRoll < DC) {
                                    await ChatMessage.create({
                                        content: `${t.name} failed the save with a ${saveRoll}`,
                                    });
                                    await MidiMacros.addDfred("Frightened", actor);
                                }
                                else {
                                    await ChatMessage.create({
                                        content: `${t.name} passed the save with a ${saveRoll}`,
                                    });
                                }
                            }
                        },
                    },
                    three: {
                        label: "Sickened",
                        callback: async () => {
                            for (const t of game.user?.targets) {
                                //@ts-ignore
                                const flavor = `${CONFIG.DND5E.abilities["wis"]} DC${DC} ${DAEItem?.name || ""}`;
                                //@ts-ignore
                                const saveRoll = (await actor.rollAbilitySave("wis", { flavor, fastFoward: true }))
                                    .total;
                                if (saveRoll < DC) {
                                    await ChatMessage.create({
                                        content: `${t.name} failed the save with a ${saveRoll}`,
                                    });
                                    await MidiMacros.addDfred("Poisoned", actor);
                                }
                                else {
                                    await ChatMessage.create({
                                        content: `${t.name} passed the save with a ${saveRoll}`,
                                    });
                                }
                            }
                        },
                    },
                },
            }).render(true);
        }
        if (args[0] === "on") {
            EyebiteDialog();
            await ChatMessage.create({ content: `${actor.name} is blessed with Eyebite` });
        }
        //Cleanup hooks and flags.
        if (args[0] === "each") {
            EyebiteDialog();
        }
    }
    static async findSteed(args) {
        if (!game.modules.get("warpgate")?.active) {
            ui.notifications.error("Please enable the Warp Gate module");
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
            await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
        }
        const menuData = {
            inputs: [
                {
                    label: "Fey",
                    type: "radio",
                    options: "group1",
                },
                {
                    label: "Fiend",
                    type: "radio",
                    options: "group1",
                },
                {
                    label: "Celestial",
                    type: "radio",
                    options: "group1",
                },
            ],
            buttons: [
                {
                    label: "Warhorse",
                    value: {
                        token: { name: "Warhorse" },
                        actor: { name: "Warhorse" },
                    },
                },
                {
                    label: "Pony",
                    value: {
                        token: { name: "Pony" },
                        actor: { name: "Pony" },
                    },
                },
                {
                    label: "Camel",
                    value: {
                        token: { name: "Camel" },
                        actor: { name: "Camel" },
                    },
                },
                {
                    label: "Elk",
                    value: {
                        token: { name: "Elk" },
                        actor: { name: "Elk" },
                    },
                },
                {
                    label: "Mastiff",
                    value: {
                        token: { name: "Mastiff" },
                        actor: { name: "Mastiff" },
                    },
                },
            ],
            title: "What type of steed?",
        };
        const pack = game.packs.get("dnd5e.monsters");
        await pack.getIndex();
        //@ts-ignore
        const dialog = await warpgate.menu(menuData);
        const index = pack.index.find((i) => i.name === dialog.buttons.actor.name);
        const compendium = await pack.getDocument(index._id);
        const updates = {
            token: compendium.data.token,
            actor: compendium.toObject(),
        };
        //@ts-ignore
        updates.actor.data.details.type.value = dialog.inputs.find((i) => !!i).toLowerCase();
        //@ts-ignore
        await warpgate.spawn(CONSTANTS.MODULE_NAME, updates, {}, { controllingActor: actor });
    }
    static async fireShield(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            new Dialog({
                title: "Warm or Cold Shield",
                content: "",
                buttons: {
                    one: {
                        label: "Warm",
                        callback: async () => {
                            //@ts-ignore
                            const resistances = duplicate(actor.system.traits.dr.value);
                            resistances.push("cold");
                            await actor.update({ "data.traits.dr.value": resistances });
                            //@ts-ignore
                            await DAE.setFlag(actor, "FireShield", "cold");
                            await ChatMessage.create({ content: `${actor.name} gains resistnace to cold` });
                            await actor.createEmbeddedDocuments("Item", [
                                {
                                    name: "Summoned Fire Shield",
                                    type: "weapon",
                                    img: "systems/dnd5e/icons/spells/protect-red-3.jpg",
                                    data: {
                                        source: "Fire Shield Spell",
                                        activation: {
                                            type: "special",
                                            cost: 0,
                                            condition: "whenever a creature within 5 feet of you hits you with a melee Attack",
                                        },
                                        actionType: "other",
                                        damage: {
                                            parts: [["2d8", "fire"]],
                                        },
                                        weaponType: "natural",
                                    },
                                    effects: [],
                                },
                            ]);
                        },
                    },
                    two: {
                        label: "Cold",
                        callback: async () => {
                            //@ts-ignore
                            const resistances = duplicate(actor.system.traits.dr.value);
                            resistances.push("fire");
                            await actor.update({ "data.traits.dr.value": resistances });
                            //@ts-ignore
                            await DAE.setFlag(actor, "FireShield", "fire");
                            await ChatMessage.create({ content: `${actor.name} gains resistance to fire` });
                            await actor.createEmbeddedDocuments("Item", [
                                {
                                    name: "Summoned Fire Shield",
                                    type: "weapon",
                                    img: "systems/dnd5e/icons/spells/protect-blue-3.jpg",
                                    data: {
                                        source: "Fire Shield Spell",
                                        activation: {
                                            type: "special",
                                            cost: 0,
                                            condition: "whenever a creature within 5 feet of you hits you with a melee Attack",
                                        },
                                        actionType: "other",
                                        damage: {
                                            parts: [["2d8", "cold"]],
                                        },
                                        weaponType: "natural",
                                    },
                                    effects: [],
                                },
                            ]);
                        },
                    },
                },
            }).render(true);
        }
        if (args[0] === "off") {
            const item = actor.items.getName("Summoned Fire Shield");
            //@ts-ignore
            const element = DAE.getFlag(actor, "FireShield");
            //@ts-ignore
            const resistances = actor.system.traits.dr.value;
            const index = resistances.indexOf(element);
            resistances.splice(index, 1);
            await actor.update({ "data.traits.dr.value": resistances });
            await ChatMessage.create({ content: "Fire Shield expires on " + actor.name });
            //@ts-ignore
            await DAE.unsetFlag(actor, "FireShield");
            //@ts-ignore
            await actor.deleteEmbeddedDocuments("Item", [item.id]);
        }
    }
    static async flameBlade(args) {
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        if (args[0] === "on") {
            const weaponDamge = 2 + Math.floor(DAEItem.data.level / 2);
            await actor.createEmbeddedDocuments("Item", [
                {
                    name: "Summoned Flame Blade",
                    type: "weapon",
                    data: {
                        quantity: 1,
                        activation: {
                            type: "action",
                            cost: 1,
                            condition: "",
                        },
                        target: {
                            value: 1,
                            width: null,
                            units: "",
                            type: "creature",
                        },
                        range: {
                            value: 5,
                        },
                        ability: "",
                        actionType: "msak",
                        attackBonus: "0",
                        damage: {
                            parts: [[`${weaponDamge}d6`, "fire"]],
                        },
                        weaponType: "simpleM",
                        proficient: true,
                    },
                    flags: {
                        "midi-items-community": {
                            FlameBlade: actor.id,
                        },
                    },
                    img: DAEItem.img,
                    effects: [],
                },
            ]);
            ui.notifications.notify("A Flame Blade appears in your inventory");
        }
        // Delete Flame Blade
        if (args[0] === "off") {
            MidiMacros.deleteItems("FlameBlade", actor);
        }
    }
    static async fleshToStone(args) {
        if (!game.modules.get("dfreds-convenient-effects")?.active) {
            ui.notifications.error("Please enable the CE module");
            return;
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEItem.data.save;
        const dc = args[1];
        if (args[0] === "on") {
            await MidiMacros.addDfred("Restrained", actor);
            //@ts-ignore
            await DAE.setFlag(actor, "FleshToStoneSpell", {
                successes: 0,
                failures: 1,
            });
        }
        if (args[0] === "off") {
            //@ts-ignore
            await DAE.unsetFlag("world", "FleshToStoneSpell");
            await ChatMessage.create({
                content: "Flesh to stone ends, if concentration was maintained for the entire duration,the creature is turned to stone until the effect is removed. ",
            });
        }
        if (args[0] === "each") {
            //@ts-ignore
            const flag = DAE.getFlag(actor, "FleshToStoneSpell");
            if (flag.failures === 3) {
                return;
            }
            //@ts-ignore
            const flavor = `${CONFIG.DND5E.abilities[saveData.ability]} DC${dc} ${DAEItem?.name || ""}`;
            //@ts-ignore
            const saveRoll = (await actor.rollAbilitySave(saveData.ability, { flavor, fastForward: true })).total;
            if (saveRoll < dc) {
                if (flag.failures === 2) {
                    const fleshToStoneFailures = flag.failures + 1;
                    //@ts-ignore
                    await DAE.setFlag(actor, "FleshToStoneSpell", {
                        failures: fleshToStoneFailures,
                    });
                    await ChatMessage.create({ content: `Flesh To Stone on ${actor.name} is complete` });
                    FleshToStoneUpdate();
                    return;
                }
                else {
                    const fleshToStoneFailures = flag.failures + 1;
                    //@ts-ignore
                    await DAE.setFlag(actor, "FleshToStoneSpell", {
                        failures: fleshToStoneFailures,
                    });
                    console.log(`Flesh To Stone failures increments to ${fleshToStoneFailures}`);
                }
            }
            else if (saveRoll >= dc) {
                if (flag.successes === 2) {
                    await ChatMessage.create({ content: `Flesh To Stone on ${actor.name} ends` });
                    await actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.effectId]);
                    await MidiMacros.addDfred("Restrained", actor);
                    return;
                }
                else {
                    const fleshToStoneSuccesses = flag.successes + 1;
                    //@ts-ignore
                    await DAE.setFlag(actor, "FleshToStoneSpell", {
                        successes: fleshToStoneSuccesses,
                    });
                    console.log(`Flesh To Stone successes to ${fleshToStoneSuccesses}`);
                }
            }
        }
        async function FleshToStoneUpdate() {
            const fleshToStone = actor.effects.get(lArgs.effectId);
            let icon = fleshToStone.data.icon;
            if (!icon && game.modules.get("dfreds-convenient-effects")?.active) {
                icon = "modules/dfreds-convenient-effects/images/petrified.svg";
            }
            else if (!icon) {
                icon = "icons/svg/paralysis.svg";
            }
            let label = fleshToStone.data.label;
            label = "Flesh to Stone - Petrified";
            let time = fleshToStone.data.duration.seconds;
            time = 60000000;
            await fleshToStone.update({ icon, label, time });
        }
    }
    static async giantInsect(args) {
        if (!game.modules.get("warpgate")?.active) {
            ui.notifications.error("Please enable the Warp Gate module");
        }
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
                await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
            }
            const buttonData = {
                buttons: [
                    {
                        label: "Centipedes",
                        value: {
                            token: { name: "Giant Centipede" },
                            actor: { name: "Giant Centipede" },
                            cycles: 10,
                        },
                    },
                    {
                        label: "Spiders",
                        value: {
                            token: { name: "Giant Spider" },
                            actor: { name: "Giant Spider" },
                            cycles: 3,
                        },
                    },
                    {
                        label: "Wasps",
                        value: {
                            token: { name: "Giant Wasp" },
                            actor: { name: "Giant Wasp" },
                            cycles: 5,
                        },
                    },
                    {
                        label: "Scorpion",
                        value: {
                            token: { name: "Giant Scorpion" },
                            actor: { name: "Giant Scorpion" },
                            cycles: 1,
                        },
                    },
                ],
                title: "Which type of insect?",
            };
            const pack = game.packs.get("dnd5e.monsters");
            await pack.getIndex();
            //@ts-ignore
            const dialog = await warpgate.buttonDialog(buttonData);
            const index = pack.index.find((i) => i.name === dialog.actor.name);
            const compendium = await pack.getDocument(index._id);
            const updates = {
                token: compendium.data.token,
                actor: compendium.toObject(),
            };
            updates.token.flags["midi-items-community"] = {
                GiantInsect: { ActorId: actor.id },
            };
            //@ts-ignore
            await warpgate.spawn(CONSTANTS.MODULE_NAME, updates, {}, {
                controllingActor: actor,
                duplicates: dialog.cycles,
            });
        }
        if (args[0] === "off") {
            MidiMacros.deleteTokens("GiantInsect", actor);
        }
    }
    static async invisibility(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (token) {
            if (args[0] === "on") {
                await ChatMessage.create({
                    content: `${token.name} turns invisible`,
                    whisper: [game.user],
                });
                await token.document.update({ hidden: true });
            }
            if (args[0] === "off") {
                await ChatMessage.create({
                    content: `${token.name} re-appears`,
                    whisper: [game.user],
                });
                await token.document.update({ hidden: false });
            }
        }
        else {
            warn(`No token is found for the 'invisibility' macro`, true);
        }
    }
    static async heroism(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const mod = args[1];
        if (args[0] === "on") {
            await ChatMessage.create({ content: `Heroism is applied to ${actor.name}` });
        }
        if (args[0] === "off") {
            await ChatMessage.create({ content: "Heroism ends" });
        }
        if (args[0] === "each") {
            //@ts-ignore
            const bonus = mod > actor.system.attributes.hp.temp ? mod : actor.system.attributes.hp.temp;
            await actor.update({ "system.attributes.hp.temp": mod });
            await ChatMessage.create({ content: "Heroism continues on " + actor.name });
        }
    }
    static async laughter(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEItem.data.save;
        const caster = canvas.tokens?.placeables?.find((token) => token?.actor?.items.get(DAEItem._id) != null);
        if (args[0] === "on") {
            //@ts-ignore
            if (actor.system.abilities.int.value < 4) {
                //@ts-ignore
                actor.deleteEmbeddedEntity("ActiveEffect", lArgs.efData._id);
            }
            //@ts-ignore
            RollHideousSave(target);
        }
        async function RollHideousSave(target) {
            console.log("SetHook");
            //@ts-ignore
            const hookId = Hooks.on("preUpdateActor", async (actor, update) => {
                //@ts-ignore
                if (!"actorData.system.attributes.hp" in update) {
                    return;
                }
                const oldHP = actor.system.attributes.hp.value;
                const newHP = getProperty(update, "system.attributes.hp.value");
                const hpChange = oldHP - newHP;
                if (hpChange > 0 && typeof hpChange === "number") {
                    //@ts-ignore
                    const flavor = `${CONFIG.DND5E.abilities["wis"]} DC${saveData.dc} ${DAEItem?.name || ""}`;
                    const saveRoll = (await actor.rollAbilitySave(saveData.ability, { flavor, fastForward: true, advantage: true })).total;
                    if (saveRoll < saveData.dc)
                        return;
                    await actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.efData._id]);
                }
            });
            if (args[0] !== "on") {
                //@ts-ignore
                const flavor = `${CONFIG.DND5E.abilities["wis"]} DC${saveData.dc} ${DAEItem?.name || ""}`;
                //@ts-ignore
                const saveRoll = (await actor.rollAbilitySave(saveData.ability, { flavor })).total;
                if (saveRoll >= saveData.dc) {
                    actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.efData._id]);
                }
            }
            //@ts-ignore
            await DAE.setFlag(actor, "hideousLaughterHook", hookId);
        }
        async function RemoveHook() {
            //@ts-ignore
            const flag = await DAE.getFlag(actor, "hideousLaughterHook");
            Hooks.off("preUpdateActor", flag);
            //@ts-ignore
            await DAE.unsetFlag(actor, "hideousLaughterHook");
            //@ts-ignore
            if (args[0] === "off") {
                //@ts-ignore
                game.cub.addCondition("Prone", actor);
            }
        }
        if (args[0] === "off") {
            RemoveHook();
        }
        if (args[0] === "each") {
            await RemoveHook();
            //@ts-ignore
            await RollHideousSave();
        }
    }
    static async dance(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEItem.data.save;
        const DC = args[1];
        //@ts-ignore
        if (args[0] === "each") {
            //@ts-ignore
            new Dialog({
                title: "Use action to make a wisdom save to end Irresistible Dance?",
                buttons: {
                    one: {
                        label: "Yes",
                        callback: async () => {
                            //@ts-ignore
                            const flavor = `${CONFIG.DND5E.abilities[saveData.ability]} DC${DC} ${DAEItem?.name || ""}`;
                            //@ts-ignore
                            const saveRoll = (await actor.rollAbilitySave(saveData.ability, { flavor })).total;
                            if (saveRoll >= DC) {
                                await actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.effectId]);
                            }
                            if (saveRoll < DC) {
                                await ChatMessage.create({ content: `${actor.name} fails the save` });
                            }
                        },
                    },
                    two: {
                        label: "No",
                        callback: () => { },
                    },
                },
            }).render(true);
        }
    }
    static async levitate(args) {
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            //@ts-ignore
            await ChatMessage.create({ content: `${token.name} is levitated 20ft` });
            //@ts-ignore
            await token.document.update({ elevation: 20 });
        }
        if (args[0] === "off") {
            //@ts-ignore
            await token.document.update({ elevation: 0 });
            //@ts-ignore
            await ChatMessage.create({ content: `${token.name} is returned to the ground` });
        }
    }
    static async magicWeapon(args) {
        //DAE Item Macro Execute, arguments = @item.level
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const weapons = actor.items.filter((i) => i.data.type === `weapon`);
        let weapon_content = ``;
        function value_limit(val, min, max) {
            return val < min ? min : val > max ? max : val;
        }
        //Filter for weapons
        for (const weapon of weapons) {
            weapon_content += `<label class="radio-label">
                <input type="radio" name="weapon" value="${weapon.id}">
                <img src="${weapon.img}" style="border:0px; width: 50px; height:50px;">
                ${weapon.data.name}
            </label>`;
        }
        /**
         * Select for weapon and apply bonus based on spell level
         */
        if (args[0] === "on") {
            const content = `
                <form class="magicWeapon">
                <div class="form-group" id="weapons">
                    ${weapon_content}
                </div>
                </form>
                `;
            //@ts-ignore
            new Dialog({
                content,
                buttons: {
                    Ok: {
                        label: `Ok`,
                        callback: async (html) => {
                            const itemId = $("input[type='radio'][name='weapon']:checked").val();
                            const weaponItem = actor.items.get(itemId);
                            const copy_item = duplicate(weaponItem);
                            const spellLevel = Math.floor(DAEItem.data.level / 2);
                            const bonus = value_limit(spellLevel, 1, 3);
                            //@ts-ignore
                            const wpDamage = copy_item.system.damage.parts[0][0];
                            //@ts-ignore
                            const verDamage = copy_item.system.damage.versatile;
                            //@ts-ignore
                            await DAE.setFlag(actor, `magicWeapon`, {
                                //@ts-ignore
                                damage: weaponItem.system.attackBonus,
                                weapon: itemId,
                                weaponDmg: wpDamage,
                                verDmg: verDamage,
                                //@ts-ignore
                                mgc: copy_item.system.properties.mgc,
                            });
                            //@ts-ignore
                            if (copy_item.system.attackBonus === "") {
                                //@ts-ignore
                                copy_item.system.attackBonus = "0";
                            }
                            //@ts-ignore
                            copy_item.system.attackBonus = `${parseInt(copy_item.system.attackBonus) + bonus}`;
                            //@ts-ignore
                            copy_item.system.damage.parts[0][0] = wpDamage + " + " + bonus;
                            //@ts-ignore
                            copy_item.system.properties.mgc = true;
                            if (verDamage !== "" && verDamage !== null) {
                                //@ts-ignore
                                copy_item.system.damage.versatile = verDamage + " + " + bonus;
                            }
                            await actor.updateEmbeddedDocuments("Item", [copy_item]);
                        },
                    },
                    Cancel: {
                        label: `Cancel`,
                    },
                },
            }).render(true);
        }
        //Revert weapon and unset flag.
        if (args[0] === "off") {
            //@ts-ignore
            const { damage, weapon, weaponDmg, verDmg, mgc } = DAE.getFlag(actor, "magicWeapon");
            const weaponItem = actor.items.get(weapon);
            const copy_item = duplicate(weaponItem);
            //@ts-ignore
            copy_item.system.attackBonus = damage;
            //@ts-ignore
            copy_item.system.damage.parts[0][0] = weaponDmg;
            //@ts-ignore
            copy_item.system.properties.mgc = mgc;
            if (verDmg !== "" && verDmg !== null) {
                //@ts-ignore
                copy_item.system.damage.versatile = verDmg;
            }
            await actor.updateEmbeddedDocuments("Item", [copy_item]);
            //@ts-ignore
            await DAE.unsetFlag(actor, `magicWeapon`);
        }
    }
    static async mistyStep(args) {
        //DAE Macro Execute, Effect Value = "Macro Name" @target
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (args[0] === "on") {
            const range = canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                {
                    t: "circle",
                    user: game.user?.id,
                    //@ts-ignore
                    x: token.x + canvas.grid?.size / 2,
                    //@ts-ignore
                    y: token.y + canvas.grid?.size / 2,
                    direction: 0,
                    distance: 30,
                    borderColor: "#FF0000",
                    flags: { "midi-items-community": { MistyStep: { ActorId: actor.id } } },
                },
            ]);
            range?.then((result) => {
                const templateData = {
                    t: "rect",
                    user: game.user?.id,
                    distance: 7.5,
                    direction: 45,
                    x: 0,
                    y: 0,
                    fillColor: game.user?.color,
                    flags: { "midi-items-community": { MistyStep: { ActorId: actor.id } } },
                };
                Hooks.once("createMeasuredTemplate", deleteTemplatesAndMove);
                MidiMacros.templateCreation(templateData, actor);
                async function deleteTemplatesAndMove(template) {
                    MidiMacros.deleteTemplates("MistyStep", actor);
                    //@ts-ignore
                    await token?.document.update({ x: template.data.x, y: template.data.y }, { animate: false });
                    await actor.deleteEmbeddedDocuments("ActiveEffect", [lArgs.effectId]);
                }
            });
        }
    }
    static async moonbeam(args) {
        //DAE Item Macro Execute, Effect Value = @attributes.spelldc
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const saveData = DAEItem.data.save;
        const DC = args[1];
        if (args[0] === "on") {
            const range = canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                {
                    t: "circle",
                    user: game.user?.id,
                    //@ts-ignore
                    x: token.x + canvas.grid.size / 2,
                    //@ts-ignore
                    y: token.y + canvas.grid.size / 2,
                    direction: 0,
                    distance: 60,
                    borderColor: "#517bc9",
                    flags: { "midi-items-community": { MoonbeamRange: { ActorId: actor.id } } },
                },
            ]);
            range?.then((result) => {
                const templateData = {
                    t: "circle",
                    user: game.user?.id,
                    distance: 5,
                    direction: 0,
                    x: 0,
                    y: 0,
                    flags: {
                        "midi-items-community": { Moonbeam: { ActorId: actor.id } },
                    },
                    fillColor: game.user?.color,
                };
                //@ts-ignore
                Hooks.once("createMeasuredTemplate", MidiMacros.deleteTemplates("MoonbeamRange", actor));
                MidiMacros.templateCreation(templateData, actor);
            });
            const damage = DAEItem.data.level;
            await actor.createEmbeddedDocuments("Item", [
                {
                    name: "Moonbeam repeating",
                    type: "spell",
                    data: {
                        source: "Casting Moonbeam",
                        ability: "",
                        description: {
                            value: "half damage on save",
                        },
                        actionType: "save",
                        attackBonus: 0,
                        damage: {
                            parts: [[`${damage}d10`, "radiant"]],
                        },
                        formula: "",
                        save: {
                            ability: "con",
                            dc: saveData.dc,
                            scaling: "spell",
                        },
                        level: 0,
                        school: "abj",
                        preparation: {
                            mode: "prepared",
                            prepared: false,
                        },
                    },
                    flags: { "midi-items-community": { Moonbeam: { ActorId: actor.id } } },
                    img: DAEItem.img,
                    effects: [],
                },
            ]);
        }
        if (args[0] === "off") {
            MidiMacros.deleteItems("Moonbeam", actor);
            MidiMacros.deleteTemplates("Moonbeam", actor);
        }
    }
    static async protectionFromEnergy(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const content = `
    <form class="protEnergy">
            <div class="form-group" id="types">
              <label class="radio-label">
                <input type="radio" name="type" value="acid">
                <img src="icons/magic/acid/dissolve-bone-white.webp" style="border:0px; width: 50px; height:50px;">
                  Acid
              </label>
              <label class="radio-label">
                <input type="radio" name="type" value="cold">
                <img src="icons/magic/water/barrier-ice-crystal-wall-jagged-blue.webp" style="border:0px; width: 50px; height:50px;">
                Cold
              </label>
              <label class="radio-label">
              <input type="radio" name="type" value="fire">
              <img src="icons/magic/fire/barrier-wall-flame-ring-yellow.webp" style="border:0px; width: 50px; height:50px;">
              Fire
            </label>
            <label class="radio-label">
            <input type="radio" name="type" value="lightning">
            <img src="icons/magic/lightning/bolt-strike-blue.webp" style="border:0px; width: 50px; height:50px;">
            Lighting
          </label>
                <label class="radio-label">
                <input type="radio" name="type" value="thunder">
                <img src="icons/magic/sonic/explosion-shock-wave-teal.webp" style="border:0px; width: 50px; height:50px;">
                Thunder
              </label>
            </div>
          </form>
`;
        if (args[0] === "on") {
            new Dialog({
                title: "Choose a damage type",
                content: content,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: async (html) => {
                            const element = $("input[type='radio'][name='type']:checked").val();
                            //@ts-ignore
                            const resistances = actor.system.traits.dr.value;
                            resistances.push(element);
                            await actor.update({ "data.traits.dr.value": resistances });
                            //@ts-ignore
                            await DAE.setFlag(actor, "ProtectionFromEnergy", element);
                            await ChatMessage.create({ content: `${actor.name} gains resistance to ${element}` });
                        },
                    },
                },
            }).render(true, { width: 400 });
        }
        if (args[0] === "off") {
            //@ts-ignore
            const element = DAE.getFlag(actor, "ProtectionFromEnergy");
            //@ts-ignore
            const resistances = actor.system.traits.dr.value;
            const index = resistances.indexOf(element);
            resistances.splice(index, 1);
            await actor.update({ "data.traits.dr.value": resistances });
            //@ts-ignore
            await DAE.unsetFlag(actor, "ProtectionFromEnergy");
            await ChatMessage.create({ content: `${actor.name} loses resistance to ${element}` });
        }
    }
    static async rayOfEnfeeblement(args) {
        if (!game.modules.get("advanced-macros")?.active)
            ui.notifications.error("Please enable the Advanced Macros module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const weapons = actor.items.filter((i) => i.data.type === `weapon`);
        /**
         * For every str weapon, update the damage formulas to half the damage, set flag of original
         */
        if (args[0] === "on") {
            //@ts-ignore
            for (const weapon of weapons) {
                //@ts-ignore
                if (weapon.abilityMod === "str") {
                    //@ts-ignore
                    const newWeaponParts = duplicate(weapon.system.damage.parts);
                    await weapon.setFlag("world", "RayOfEnfeeblement", newWeaponParts);
                    //@ts-ignore
                    for (const part of weapon.system.damage.parts) {
                        part[0] = `floor((${part[0]})/2)`;
                    }
                    //@ts-ignore
                    await weapon.update({ "system.damage.parts": weapon.system.damage.parts });
                }
            }
        }
        // Update weapons to old value
        if (args[0] === "off") {
            for (const weapon of weapons) {
                const parts = weapon.getFlag("world", "RayOfEnfeeblement");
                await weapon.update({ "system.damage.parts": parts });
            }
        }
    }
    static async regenerate(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        /**
         * Set hooks to fire on combat update and world time update
         */
        if (args[0] === "on") {
            // If 6s elapses, update HP by one
            const timeHookId = Hooks.on("updateWorldTime", async (currentTime, updateInterval) => {
                const effect = actor.effects.find((i) => i.data.label === "Regenerate");
                //@ts-ignore
                const applyTime = effect.data.duration.startTime;
                //@ts-ignore
                const expireTime = applyTime + effect.data.duration.seconds;
                const healing = roundCount(currentTime, updateInterval, applyTime, expireTime);
                //@ts-ignore
                await actor.applyDamage(-healing);
                await ChatMessage.create({ content: `${actor.name} gains 1 hp` });
            });
            actor.setFlag("world", "Regenerate", {
                timeHook: timeHookId,
            });
        }
        if (args[0] === "off") {
            async function RegenerateOff() {
                const flag = await actor.getFlag("world", "Regenerate");
                //@ts-ignore
                Hooks.off("updateWorldTime", flag.timeHook);
                await actor.unsetFlag("world", "Regenerate");
                console.log("Regenerate removed");
            }
            RegenerateOff();
        }
        /**
         *
         * @param {Number} currentTime current world time
         * @param {Number} updateInterval amount the world time was incremented
         * @param {Number} applyTime time the effect was applied
         * @param {Number} expireTime time the effect should expire
         */
        function roundCount(currentTime, updateInterval, applyTime, expireTime) {
            // Don't count time before applyTime
            if (currentTime - updateInterval < applyTime) {
                const offset = applyTime - (currentTime - updateInterval);
                updateInterval -= offset;
            }
            // Don't count time after expireTime
            if (currentTime > expireTime) {
                const offset = currentTime - expireTime;
                currentTime = expireTime;
                updateInterval -= offset;
            }
            const sTime = currentTime - updateInterval;
            const fRound = sTime + 6 - (sTime % 6); // Time of the first round
            const lRound = currentTime - (currentTime % 6); // Time of the last round
            let roundCount = 0;
            if (lRound >= fRound)
                roundCount = (lRound - fRound) / 6 + 1;
            return roundCount;
        }
    }
    static async shillelagh(args) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        // we see if the equipped weapons have base weapon set and filter on that, otherwise we just get all weapons
        const filteredWeapons = actor.items.filter((i) => {
            //@ts-ignore
            return i.data.type === "weapon" && (i.system.baseItem === "club" || i.system.baseItem === "quarterstaff");
        });
        const weapons = filteredWeapons.length > 0 ? filteredWeapons : actor.items.filter((i) => i.data.type === "weapon");
        const weapon_content = weapons.map((w) => `<option value=${w.id}>${w.name}</option>`).join("");
        if (args[0] === "on") {
            const content = `
                <div class="form-group">
                <label>Weapons : </label>
                <select name="weapons">
                ${weapon_content}
                </select>
                </div>
                `;
            new Dialog({
                title: "Choose a club or quarterstaff",
                content,
                buttons: {
                    Ok: {
                        label: "Ok",
                        callback: async (html) => {
                            //@ts-ignore
                            const itemId = html.find("[name=weapons]")[0].value;
                            const weaponItem = actor.getEmbeddedDocument("Item", itemId);
                            const weaponCopy = duplicate(weaponItem);
                            //@ts-ignore
                            await DAE.setFlag(actor, "shillelagh", {
                                id: itemId,
                                //@ts-ignore
                                name: weaponItem.name,
                                //@ts-ignore
                                damage: weaponItem.system.damage.parts[0][0],
                                //@ts-ignore
                                ability: weaponItem.system.ability,
                                //@ts-ignore
                                magical: getProperty(weaponItem, "system.properties.mgc") || false,
                            });
                            //@ts-ignore
                            const damage = weaponCopy.system.damage.parts[0][0];
                            //@ts-ignore
                            const targetAbilities = actor.system.abilities;
                            //@ts-ignore
                            weaponCopy.system.damage.parts[0][0] = damage.replace(/1d(4|6)/g, "1d8");
                            if (targetAbilities.wis.value > targetAbilities.str.value) {
                                weaponCopy.data.ability = "wis";
                            }
                            //@ts-ignore
                            weaponCopy.name = weaponItem.name + " [Shillelagh]";
                            setProperty(weaponCopy, "system.properties.mgc", true);
                            await actor.updateEmbeddedDocuments("Item", [weaponCopy]);
                            await ChatMessage.create({
                                content: weaponCopy.name + " is empowered by Shillelagh",
                            });
                        },
                    },
                    Cancel: {
                        label: `Cancel`,
                    },
                },
            }).render(true);
        }
        if (args[0] === "off") {
            //@ts-ignore
            const flag = DAE.getFlag(actor, "shillelagh");
            const weaponItem = actor.getEmbeddedDocument("Item", flag.id);
            const weaponCopy = duplicate(weaponItem);
            weaponCopy.system.damage.parts[0][0] = flag.damage;
            weaponCopy.data.ability = flag.ability;
            weaponCopy.name = flag.name;
            setProperty(weaponCopy, "system.properties.mgc", flag.magical);
            await actor.updateEmbeddedDocuments("Item", [weaponCopy]);
            //@ts-ignore
            await DAE.unsetFlag(target, "shillelagh");
            await ChatMessage.create({ content: weaponCopy.name + " returns to normal" });
        }
    }
    static async spiritualWeapon(args, texture) {
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const castingItem = lArgs.efData.flags.dae.itemData;
        if (args[0] === "on") {
            const damage = Math.floor(Math.floor(args[1] / 2));
            const image = castingItem.img;
            const range = canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                {
                    t: "circle",
                    user: game.user?.id,
                    //@ts-ignore
                    x: token.x + canvas.grid?.size / 2,
                    //@ts-ignore
                    y: token.y + canvas.grid?.size / 2,
                    direction: 0,
                    distance: 60,
                    borderColor: "#FF0000",
                    flags: { "midi-items-community": { SpiritualWeaponRange: { ActorId: actor.id } } },
                },
            ]);
            range?.then((result) => {
                const templateData = {
                    t: "rect",
                    user: game.user?.id,
                    distance: 7,
                    direction: 45,
                    texture: texture || "",
                    x: 0,
                    y: 0,
                    flags: { "midi-items-community": { SpiritualWeapon: { ActorId: actor.id } } },
                    fillColor: game.user?.color,
                };
                //@ts-ignore
                Hooks.once("createMeasuredTemplate", MidiMacros.deleteTemplates("SpiritualWeaponRange", actor));
                MidiMacros.templateCreation(templateData, actor);
            });
            await actor.createEmbeddedDocuments("Item", [
                {
                    name: "Summoned Spiritual Weapon",
                    type: "weapon",
                    data: {
                        equipped: true,
                        identified: true,
                        activation: {
                            type: "bonus",
                        },
                        target: {
                            value: 1,
                            width: null,
                            type: "creature",
                        },
                        range: {
                            value: 5,
                            units: "ft",
                        },
                        ability: args[2],
                        actionType: "msak",
                        attackBonus: "0",
                        chatFlavor: "",
                        critical: null,
                        damage: {
                            parts: [[`${damage}d8+@mod`, "force"]],
                        },
                        weaponType: "simpleM",
                        proficient: true,
                    },
                    flags: { "midi-items-community": { SpiritualWeapon: actor.id } },
                    img: `${image}`,
                    effects: [],
                },
            ]);
            ui.notifications.notify("Weapon created in your inventory");
        }
        if (args[0] === "off") {
            MidiMacros.deleteItems("SpiritualWeapon", actor);
            MidiMacros.deleteTemplates("SpiritualWeapon", actor);
        }
    }
    static async unseenServant(args, texture) {
        if (!game.modules.get("warpgate")?.active)
            ui.notifications.error("Please enable the Warp Gate module");
        const { actor, token, lArgs } = MidiMacros.targets(args);
        if (!game.actors?.getName(CONSTANTS.MODULE_NAME)) {
            await Actor.create({ name: CONSTANTS.MODULE_NAME, type: "npc" });
        }
        texture = texture || lArgs.item.img;
        const updates = {
            token: {
                name: "Unseen Servant",
                img: texture,
            },
            actor: {
                name: "Unseen Servant",
                "system.attributes": { "ac.value": 10, "hp.value": 1 },
                "data.abilities.str.value": 2,
            },
        };
        const { x, y } = await MidiMacros.warpgateCrosshairs(token, 60, "Unseen Servant", texture, {}, -1);
        //@ts-ignore
        await warpgate.spawnAt({ x, y }, CONSTANTS.MODULE_NAME, updates, { controllingActor: actor });
    }
    static async wardingBond(args) {
        //DAE Macro Execute, Effect Value = "Macro Name" @target @item
        const { actor, token, lArgs } = MidiMacros.targets(args);
        const DAEItem = lArgs.efData.flags.dae.itemData;
        const caster = canvas.tokens?.placeables?.find((token) => token?.actor?.items.get(DAEItem._id) != null);
        if (args[0] === "on") {
            //@ts-ignore
            await DAE.setFlag(actor, "WardingBondIds", {
                tokenID: actor.id,
                //@ts-ignore
                casterID: caster.actor?.id,
            });
            SetWardingBondHook(token);
        }
        async function SetWardingBondHook(token) {
            const hookId = Hooks.on("preUpdateActor", async (actor, update) => {
                //@ts-ignore
                const flag = await DAE.getFlag(actor, "WardingBondIds");
                if (flag.tokenID !== actor.id)
                    return;
                //@ts-ignore
                if (!"actorData.system.attributes.hp" in update)
                    return;
                const oldHP = actor.system.attributes.hp.value;
                const newHP = getProperty(update, "system.attributes.hp.value");
                const hpChange = oldHP - newHP;
                if (hpChange > 0 && typeof hpChange === "number") {
                    const caster = game.actors?.get(flag.casterID)?.getActiveTokens()[0];
                    //@ts-ignore
                    caster?.actor?.applyDamage(hpChange);
                }
            });
            //@ts-ignore
            await DAE.setFlag(actor, "WardingBondHook", hookId);
        }
        async function RemoveHook() {
            //@ts-ignore
            const flag = await DAE.getFlag(actor, "WardingBondHook");
            Hooks.off("preUpdateActor", flag);
            //@ts-ignore
            await DAE.unsetFlag(actor, "WardingBondHook");
        }
        if (args[0] === "off") {
            RemoveHook();
            //@ts-ignore
            await DAE.unsetFlag(actor, "WardingBondIds");
            console.log("Death Ward removed");
        }
        if (args[0] === "each") {
            await RemoveHook();
            await SetWardingBondHook(undefined);
        }
    }
}
//@ts-ignore
window.MidiMacros = MidiMacros;
