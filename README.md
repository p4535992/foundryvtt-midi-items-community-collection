# Midi Items Community Collection

![GitHub issues](https://img.shields.io/github/issues-raw/p4535992/foundryvtt-midi-items-community-collection?style=for-the-badge)

![Latest Release Download Count](https://img.shields.io/github/downloads/p4535992/foundryvtt-midi-items-community-collection/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) 

[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fmidi-items-community&colorB=006400&style=for-the-badge)](https://forge-vtt.com/bazaar#package=midi-items-community) 

![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fp4535992%2Ffoundryvtt-midi-items-community-collection%2Fmaster%2Fsrc%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge)

![Latest Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fp4535992%2Ffoundryvtt-midi-items-community-collection%2Fmaster%2Fsrc%2Fmodule.json&label=Latest%20Release&prefix=v&query=$.version&colorB=red&style=for-the-badge)

[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmidi-items-community%2Fshield%2Fendorsements&style=for-the-badge)](https://www.foundryvtt-hub.com/package/midi-items-community/)

![GitHub all releases](https://img.shields.io/github/downloads/p4535992/foundryvtt-midi-items-community-collection/total?style=for-the-badge)

A compendium pack for items, feats etc configured for use with Dynamic Active Effects (DAE) as well as Midi QOL.

This project was born as an opensource reference of what it is possible to do with MidiQOL, DAE and foundryvtt with the javascript programming language.

The project is dedicated exclusively to the Dnd5e game system.

The project aims to provide users with examples of javascript code that they can use for their own adventures.

**The content is intended to be related only to SRD material and homebrew material created in a personal context, but to avoid licensing issues with non-SRD licensed Wizard of the coast products the module will not be made public.**

## Installation

It's always easiest to install modules from the in game add-on browser.

To install this module manually:
1.  Inside the Foundry "Configuration and Setup" screen, click "Add-on Modules"
2.  Click "Install Module"
3.  In the "Manifest URL" field, paste the following url:
`https://raw.githubusercontent.com/p4535992/foundryvtt-midi-items-community-collection/master/module.json`
4.  Click 'Install' and wait for installation to complete
5.  Don't forget to enable the module in game using the "Manage Module" button

## Known issue

# Modules to install for better behaviour

- The [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) library for wrapping core methods
- The [item-macro](https://github.com/Kekilla0/Item-Macro)
- The [warpgate](https://github.com/trioderegion/warpgate)
- The [socketlib]()
- The [dae](https://gitlab.com/tposney/dae/)
- The [midi-qol](https://gitlab.com/tposney/midi-qol)
- The [advanced-macros](https://github.com/League-of-Foundry-Developers/fvtt-advanced-macros)
- The [foundryvtt-simple-calendar](https://github.com/vigoren/foundryvtt-simple-calendar)
- The [times-up](https://gitlab.com/tposney/times-up/raw/master/package/module.json)
## Settings


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
### lint and lintfix

`lint` launch the eslint process based on the configuration [here](./.eslintrc)

```bash
npm run-script lint
```

`lintfix` launch the eslint process with the fix argument

```bash
npm run-script lintfix
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

Any issues, bugs, or feature requests are always welcome to be reported directly to the [Issue Tracker](https://github.com/p4535992/foundryvtt-midi-items-community-collection/issues ), or using the [Bug Reporter Module](https://foundryvtt.com/packages/bug-reporter/).

## License

- [Midi-SRD](https://github.com/kandashi/midi-srd) ([MIT](https://github.com/kandashi/midi-srd/blob/master/LICENSE))

This package is under an [GPLv3 License](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).

## Acknowledgements

- Thank you to [Kandashi](https://github.com/kandashi) for the module [Midi-SRD](https://github.com/kandashi/midi-srd) inspiration

