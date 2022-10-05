# Midi Items Community Collection

![GitHub issues](https://img.shields.io/github/issues-raw/p4535992/foundryvtt-community-macros-variant?style=for-the-badge)

![Latest Release Download Count](https://img.shields.io/github/downloads/p4535992/foundryvtt-community-macros-variant/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge)

[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fmidi-items-community&colorB=006400&style=for-the-badge)](https://forge-vtt.com/bazaar#package=midi-items-community)

![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fp4535992%2Ffoundryvtt-community-macros-variant%2Fmaster%2Fsrc%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge)

![Latest Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fp4535992%2Ffoundryvtt-community-macros-variant%2Fmaster%2Fsrc%2Fmodule.json&label=Latest%20Release&prefix=v&query=$.version&colorB=red&style=for-the-badge)

[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmidi-items-community%2Fshield%2Fendorsements&style=for-the-badge)](https://www.foundryvtt-hub.com/package/midi-items-community/)

![GitHub all releases](https://img.shields.io/github/downloads/p4535992/foundryvtt-community-macros-variant/total?style=for-the-badge)


Why another macro repository ... there are too many ... this is what comes to mind when looking at this project.
The difference is that this project packs all the javascript files of the various macros in the compendium for foundryvtt updating to each build in a clever way and keeping the ids. The time saving for those who have to continually update their macros is astronomical.
In this project macros are collected by various developers that I credit below, but I do not know for sure if everyone will agree between licenses and updates I always try to be careful if there is any problem open an issue on the project and I will answer the as soon as possible.

## Installation

It's always easiest to install modules from the in game add-on browser.

To install this module manually:
1.  Inside the Foundry "Configuration and Setup" screen, click "Add-on Modules"
2.  Click "Install Module"
3.  In the "Manifest URL" field, paste the following url:
`https://raw.githubusercontent.com/p4535992/foundryvtt-community-macros-variant/master/module.json`
4.  Click 'Install' and wait for installation to complete
5.  Don't forget to enable the module in game using the "Manage Module" button

## Known issue

# Modules to install for better behaviour

![Dynamic Active Effects](https://img.shields.io/badge/Dynamic%20Active%20Effects-Required-red)
![Midi-Qol](https://img.shields.io/badge/Midi--Qol-Required-red)
![Item Macro](https://img.shields.io/badge/Item%20Macro-Recommended-lightgreen)

![About Time](https://img.shields.io/badge/About%20Time-Optional-lightgrey)
![Combat Utility Belt](https://img.shields.io/badge/Combat%20Utility%20Belt-Optional-lightgrey)
![Token Magic FX](https://img.shields.io/badge/Token%20Magic%20FX-Optional-lightgrey)
![Macro Editor](https://img.shields.io/badge/Macro%20Editor-Recommended-lightgreen)

- The [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) library for wrapping core methods
- The [item-macro](https://github.com/Kekilla0/Item-Macro)
- The [warpgate](https://github.com/trioderegion/warpgate)
- The [socketlib]()
- The [dae](https://gitlab.com/tposney/dae/)
- The [midi-qol](https://gitlab.com/tposney/midi-qol)
- The [advanced-macros](https://github.com/League-of-Foundry-Developers/fvtt-advanced-macros)
- The [foundryvtt-simple-calendar](https://github.com/vigoren/foundryvtt-simple-calendar)
- The [times-up](https://gitlab.com/tposney/times-up/raw/master/package/module.json)

## Macros repositories from the community, i use for generate the compendiums (details on the license are at the bottom of the readme)

- [Kekilla0 Personal-Macros](https://github.com/Kekilla0/Personal-Macros)
- [Otigon Foundry-Macros](https://github.com/otigon/Foundry-Macros)
- [MisterHims DnD5e-WildShape-Macro](https://github.com/MisterHims/DnD5e-WildShape-Macro)
- [Crymic foundry-vtt-macros](https://gitlab.com/crymic/foundry-vtt-macros)
- [Rinnocenti Personal-Macros](https://github.com/rinnocenti/Personal-Macros)
- [VanceCole macros](https://github.com/VanceCole/macros)
- [Unsoluble fvtt-macros](https://github.com/unsoluble/fvtt-macros)
- [flamewave000 fvtt-macros](https://github.com/flamewave000/fvtt-macros)
- [itamarcu foundry-macros](https://github.com/itamarcu/foundry-macros)
- [itamarcu shemetz-macros](https://github.com/itamarcu/shemetz-macros)
- [trioderegion fvtt-macros](https://github.com/trioderegion/fvtt-macros)
- [theripper93 FoundryVTT-Macro](https://github.com/theripper93/FoundryVTT-Macros)
- [Freeze020 foundry-vtt-scripts](https://gitlab.com/Freeze020/foundry-vtt-scripts)
- [Jeznar Utility-Macros](https://github.com/Jeznar/Utility-Macros)
- [Kuffeh1 Foundry](https://github.com/Kuffeh1/Foundry)
- [caewok Foundry-Macros](https://github.com/caewok/Foundry-Macros)
- [GeneralZero FounderyMacros](https://github.com/GeneralZero/FounderyMacros)
- [JamesBrandts FoundryVTT Macro](https://github.com/JamesBrandts/FoundryVTT)

## Settings

## How prepare the Build for the dynamic build action ?

To simplify the creation of packs with a github action activate during the creation of the release we can use this method:

1. Go under a macros system folder like `dnd5e` on the base directory of the project
2. Select a sub directory or create a new one like `spells-dnd5e`
3. Choose a macro to update like `stealth_check.js` an create a new json file with the same base name `stealth_check.json` if is absent, or create a new macro just make sure to create a json file with the same base name on the same directory.
4. Launch the command `npm run-script build` and everything is ready to be packaged for the release.

### How Prepare a json structure for your macro entry ?

Here a very basic json example:

```json
{
  "name":"Stealth Check",
  "permission":{"default":0 },
  "type":"script",
  "flags":{},
  "scope":"global",
  "command":"", // HERE IS WHERE THE ACTION PROCESS WILL COPY THE TEXT OF THE MACRO (THE JAVASCRIPT FILE)
  "author":"",
  "img":"icons/svg/dice-target.svg",
  "actorIds":[],
  "_id":"2RitOkKtnQe9pbuF"  // THIS IS THE ID TO ASSIGN TO THE MACRO, IS OPTIONAL BUT ESSENTIAL IF YOU WANT TO MAINTAIN THE REFERENCE OR NEDB WILL CREATE A NEW ONE
}
```

**NOTE:** if no javascript file is founded it will be ignored and it will be not present on the db

## Run a macro

### How to add a macro?

On the bottom hotbar of Foundry when in-game, click on an empty space. This will create and open a macro dialogue box. Here you can inject in the code. Make sure to toggle Type to `script` instead of `chat`.

![Macro](/wiki/use_macro_image/macro.jpg)

### How to execute a GM macro

To do this feature, you will need the module called [advanced-macros](https://github.com/League-of-Foundry-Developers/fvtt-advanced-macros), this will give you the ability to `Execute Macro as GM`.

### Why execute a macro as a GM macro
Foundry does **not** allow players to modify other players or npcs, only themselves. The GM however has the power to do this. So to get around this, the player can callback to a macro which has permissions to run at a GM level. The only drawback with this is a GM must be logged in and present for this to work.

### Macro Execute

This method of macro execution requires a macro stored on a users hotbar. To `call` to this macro from within DAE itself, you will need to do the following steps. First locate the item you wish to apply the macro to. Then drag it from the character to your items directory on the right side tool bar, and open it. At the top, click on the `DAE button`. Next, click on the little `+` symbol on the right hand side. Name the Active Effect whatever the item is, it will help reference if you need to later. Now click on the far right tab for `Effects`. Hit the `+` symbol to add a line.
In the dropdown list on the left, at the absolute bottom is `Macro Execute` and select it. The second field should say `Custom`, in the value field we want to enter in `Macro Name` to reference the macro on the hotbar. Now in my notes I will often have `@target` mentioned as well or other *variables*. You will need to include those too.

So all together could be `macro.execute custom "Rage" @target`.

![Active Effects](/wiki/use_macro_image/ae.jpg)
![DAE](/wiki/use_macro_image/dae-check.jpg)
![DE Macro](/wiki/use_macro_image/de-macro.jpg)

## Item Macro

Now instead of click on your hotbar to add the macro, you can instead go directly to the item and edit it. Above the item, you'll see one for `Item Macro`. Once you've clicked it a macro window will open, here paste or type in your macro. When done, save it.

![Item Macro](/wiki/item_macro_images/item-macro.jpg)

Now, we need to let DAE know to use this new item macro we just installed. Much like the previous steps above, instead of choosing `Macro Execute`,  choose `Item Macro`. This time we are **not** going to reference a macro name, because we don't need one. Alternatively, we only need to reference the variables which are going to be passed to the macro instead. So, `@target` is all we need.

![DE Item Macro](/wiki/item_macro_images/de-item-macro.jpg)

### On Use

Recent changes to DAE, now makes all macros run automatically as `macro execute` status. This becomes a problem when involving `dialog boxes`. The `dialog box` will only show for the GM. To solve this issue, we need to use Midi-Qol's `On Use` feature.

New fields we can call upon..
```
actor = actor.data (the actor using the item)
item = item.data (the item, i.e. spell/weapon/feat)
targets = [token.data] (an array of token data taken from game.user.targets)
hitTargets = [token.data] (and arry of tokend ata take from targets that were hit)
saves = [token.data] (and arry of tokend ata take from targets that made a save)
failedSaves = [token.data] (and arry of tokend ata take from targets that failed the save)
damageRoll = the Roll object for the damage roll (if any)
attackRoll = the Roll object for the attack roll (if any)
itemCardId = the id of the chat message item card (see below)
isCritical = true/false
isFumble = true/false
spellLevel = spell/item level
damageTotal = damage total
damageDetail = [type: string, damage: number] an array of the specific damage items for the attack/spell e.g. [{type: "piercing", damage: 10}]
```

First go into the Midi-Qol's module settings and click on `Workflow Settings`. Down at the very bottom you will see `add macro to call on use`, check it and save.

![on use](/wiki/item_macro_images/on_call.jpg)

Now when looking at an item's `details`. At the very bottom, there is a new field called `On Use Macro`, here enter `ItemMacro`.

![on use macro](/wiki/item_macro_images/item-on_use.jpg)

Then add the macro as normal to `Item Macro`. Make sure to **remove** any DAE `Item Macro` calls.

# Build

## Install all packages

```bash
npm install
```
## npm build scripts

### build

will build the code and copy all necessary assets into the dist folder and make a symlink to install the result into your foundry data; create a
`foundryconfig.json` file with your Foundry Data path.

```json
{
  "dataPath": "~/.local/share/FoundryVTT/"
}
```

`build` will build and set up a symlink between `dist` and your `dataPath`.

```bash
npm run-script build
```

### NOTE:

You don't need to build the `foundryconfig.json` file you can just copy the content of the `dist` folder on the module folder under `modules` of Foundry

### build:watch

`build:watch` will build and watch for changes, rebuilding automatically.

```bash
npm run-script build:watch
```

### clean

`clean` will remove all contents in the dist folder (but keeps the link from build:install).

```bash
npm run-script clean
```

### prettier-format

`prettier-format` launch the prettier plugin based on the configuration [here](./.prettierrc)

```bash
npm run-script prettier-format
```

### package

`package` generates a zip file containing the contents of the dist folder generated previously with the `build` command. Useful for those who want to manually load the module or want to create their own release

```bash
npm run-script package
```

## [Changelog](./Changelog.md)

## Issues

Any issues, bugs, or feature requests are always welcome to be reported directly to the [Issue Tracker](https://github.com/p4535992/foundryvtt-community-macros-variant/issues ), or using the [Bug Reporter Module](https://foundryvtt.com/packages/bug-reporter/).

## License

- [Midi-SRD](https://github.com/kandashi/midi-srd) ([MIT](https://github.com/kandashi/midi-srd/blob/master/LICENSE))
- [Crymic foundry-vtt-macros](https://gitlab.com/crymic/foundry-vtt-macros) ([MIT](https://gitlab.com/crymic/foundry-vtt-macros/-/blob/8.x/LICENSE))


This package is under an [GPLv3 License](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).

## Acknowledgements

- Thank you to [Kandashi](https://github.com/kandashi) for the module [Midi-SRD](https://github.com/kandashi/midi-srd) inspiration
- Thank you to [Crymic](https://gitlab.com/crymic) for the module [Crymic foundry-vtt-macros](https://gitlab.com/crymic/foundry-vtt-macros) inspiration


