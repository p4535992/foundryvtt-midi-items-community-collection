/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * This is important for the bundle.js
 */
const mainFilePath = `src/main.ts`; // MOD 4535992

const gulp = require(`gulp`);
const fs = require(`fs`);
const path = require(`path`);
const archiver = require(`archiver`);
const stringify = require(`json-stringify-pretty-compact`);

const sourcemaps = require(`gulp-sourcemaps`);
const buffer = require(`vinyl-buffer`);
const source = require(`vinyl-source-stream`);

const loadJson = (path) => {
	console.log(path);
	try {
		const str = fs.readFileSync(path).toString();
		return JSON.parse(str);
	} catch {
		throw Error(`Unable to load module.json`);
	}
};

const typescript = require(`typescript`);
// const createLiteral = typescript.createLiteral;
const createLiteral = typescript.factory.createStringLiteral;
const factory = typescript.factory;
const isExportDeclaration = typescript.isExportDeclaration;
const isImportDeclaration = typescript.isImportDeclaration;
const isStringLiteral = typescript.isStringLiteral;
const LiteralExpression = typescript.LiteralExpression;
const Node = typescript.Node;
const TransformationContext = typescript.TransformationContext;
const TSTransformer = typescript.Transformer;
const TransformerFactory = typescript.TransformerFactory;
const visitEachChild = typescript.visitEachChild;
const visitNode = typescript.visitNode;

const less = require(`gulp-less`);
const sass = require(`gulp-sass`)(require(`sass`));

// import type {ModuleData} from `@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs`; // MOD 4535992
const browserify = require(`browserify`);
const tsify = require(`tsify`);

const ts = require(`gulp-typescript`);
const git = require(`gulp-git`);
const jest = require(`gulp-jest`).default;

const argv = require(`yargs`).argv;

const rename = require("gulp-rename");
const gulpConcat = require("gulp-concat");
const gulpJsonminify = require("gulp-jsonminify");
const through2 = require("through2");
const yargs = require("yargs");
const Datastore = require("@seald-io/nedb");
const mergeStream = require("merge-stream");
const logger = require("fancy-log");

// =========================================================================

/**
 * Parsed arguments passed in through the command line.
 * @type {object}
 */
const parsedArgs = yargs(process.argv).argv;

/**
 * Folder where the compiled compendium packs should be located relative to the
 * base system folder.
 * @type {string}
 */
const PACK_DEST = "src/packs";

/**
 * Folder where source JSON files should be located relative to the 5e system folder.
 * @type {string}
 */
const PACK_SOURCES = "macros"

/**
 * Cache of DBs so they aren't loaded repeatedly when determining IDs.
 * @type {Object<string,Datastore>}
 */
const DB_CACHE = {};

/* ----------------------------------------- */
/*  Clean Packs
    /* ----------------------------------------- */

/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data  Data for a single entry to clean.
 * @param {object} [options]
 * @param {boolean} [options.clearSourceId]  Should the core sourceId flag be deleted.
 */
function cleanPackEntry(data, { clearSourceId = true } = {}) {
	if (data.ownership) {
        data.ownership = { default: 0 };
    }
	if (clearSourceId) {
        delete data.flags?.core?.sourceId;
    }
	delete data.flags?.importSource;
	delete data.flags?.exportSource;
	if (data._stats?.lastModifiedBy) {
        data._stats.lastModifiedBy = "builder0000";
    }

	// Remove empty entries in flags
	if (!data.flags) data.flags = {};
	Object.entries(data.flags).forEach(([key, contents]) => {
		if (Object.keys(contents).length === 0) {
            delete data.flags[key];
        }
	});

	if (data.effects) {
        data.effects.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
    }
	if (data.items) {
        data.items.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
    }
	if (data.system?.description?.value) {
        data.system.description.value = cleanString(data.system.description.value);
    }
	if (data.label) {
        data.label = cleanString(data.label);
    }
	if (data.name) {
        data.name = cleanString(data.name);
    }
}

/**
 * Attempts to find an existing matching ID for an item of this name, otherwise generates a new unique ID.
 * @param {object} data        Data for the entry that needs an ID.
 * @param {string} pack        Name of the pack to which this item belongs.
 * @returns {Promise<string>}  Resolves once the ID is determined.
 */
function determineId(data, pack) {
	const db_path = path.join(PACK_DEST, `${pack}.db`);
	if (!DB_CACHE[db_path]) {
		DB_CACHE[db_path] = new Datastore({ filename: db_path, autoload: true });
		DB_CACHE[db_path].loadDatabase();
	}
	const db = DB_CACHE[db_path];

	return new Promise((resolve, reject) => {
		db.findOne({ name: data.name }, (err, entry) => {
			if (entry) {
				resolve(entry._id);
			} else {
				//resolve(db.createNewId());
				resolve(undefined);
			}
		});
	});
}

/**
 * Removes invisible whitespace characters and normalises single- and double-quotes.
 * @param {string} str  The string to be cleaned.
 * @returns {string}    The cleaned string.
 */
function cleanString(str) {
	return str
		.replace(/\u2060/gu, "")
		.replace(/[‘’]/gu, "'")
		.replace(/[“”]/gu, '"');
}

/**
 * Cleans and formats source JSON files, removing unnecessary permissions and flags
 * and adding the proper spacing.
 *
 * - `gulp cleanPacks` - Clean all source JSON files.
 * - `gulp cleanPacks --pack classes` - Only clean the source files for the specified compendium.
 * - `gulp cleanPacks --pack classes --name Barbarian` - Only clean a single item from the specified compendium.
 */
function cleanPacks() {
	const packName = parsedArgs.pack;
	const entryName = parsedArgs.name?.toLowerCase();
	// const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter(file =>
	//     file.isDirectory() && ( !packName || (packName === file.name) )
	// );
    const macroFolders = fs.readdirSync(PACK_SOURCES, { withFileTypes: true }).filter(file =>
	    file.isDirectory()
	);
	let packs = [];
	for (const directoryToCheckTmp of macroFolders) {
        const directoryToCheck = path.join(PACK_SOURCES,directoryToCheckTmp.name);
		logger.info(`Cleaning pack => directoryToCheck = ${directoryToCheck}`);

		let folders = [];
		if (packName) {
			folders = fs
				.readdirSync(directoryToCheck, { withFileTypes: true })
				.filter((file) => file.isDirectory() && (!packName || packName === file.name));
		} else {
			folders = fs.readdirSync(directoryToCheck, { withFileTypes: true }).filter((file) => file.isDirectory());
		}

		const packsTmp = folders.map((folder) => {
			// logger.info(`Cleaning pack ${folder.name}`);
            const packName = path.join(directoryToCheck,`${folder.name}`).replaceAll("/","-").replaceAll("\\","-");
            logger.info(`Cleaning pack ${packName}`);
			// return gulp.src(path.join(PACK_SRC, folder.name, "/**/*.json"))
			return gulp.src(path.join(directoryToCheck, folder.name, "/**/*.json")).pipe(
				through2.obj(async (file, enc, callback) => {
					const json = JSON.parse(file.contents.toString());
					const name = json.name.toLowerCase();
					if (entryName && entryName !== name) return callback(null, file);
					cleanPackEntry(json);
					if (!json._id) {
                        logger.info(`Cleaning pack  => determineId = ${packName}`);
						json._id = await determineId(json, packName);
					}
					fs.rmSync(file.path, { force: true });
                    //logger.info(`Cleaning pack  => writeFileSync = ${file.path} `);
					fs.writeFileSync(file.path, `${JSON.stringify(json, null, 2)}\n`, { mode: 0o664 });
					callback(null, file);
				})
			);
		});
		packs.push(packsTmp);
	}

	return mergeStream(packs);
}
exports.cleanPacks = cleanPacks;

/* ----------------------------------------- */
/*  Compile Packs
    /* ----------------------------------------- */

/**
 * Compile the source JSON files into compendium packs.
 *
 * - `gulp compilePacks` - Compile all JSON files into their NEDB files.
 * - `gulp compilePacks --pack classes` - Only compile the specified pack.
 */
function compilePacks() {
	const packName = parsedArgs.pack;
	// Determine which source folders to process
	// const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter(file =>
	//     file.isDirectory() && ( !packName || (packName === file.name) )
	// );
    const macroFolders = fs.readdirSync(PACK_SOURCES, { withFileTypes: true }).filter(file =>
	    file.isDirectory()
	);
	let packs = [];
	for (const directoryToCheckTmp of macroFolders) {
        const directoryToCheck = path.join(PACK_SOURCES,directoryToCheckTmp.name);
		logger.info(`compilePacks => directoryToCheck = ${directoryToCheck}`);

		let folders = [];
		if (packName) {
			folders = fs
				.readdirSync(directoryToCheck, { withFileTypes: true })
				.filter((file) => file.isDirectory() && (!packName || packName === file.name));
		} else {
			folders = fs.readdirSync(directoryToCheck, { withFileTypes: true }).filter((file) => file.isDirectory());
		}

		const packsTmp = folders.map((folder) => {
            logger.info(`compilePacks => directoryToCheck 2 = ${path.join(directoryToCheck,`${folder.name}`)}`);

			const filesJson = fs.readdirSync(path.join(directoryToCheck,`${folder.name}`), { withFileTypes: true }).filter((file) => {
				return file && !file.isDirectory() && path.extname(file.name).toLowerCase() === `.json`;
			});
            if(!filesJson || filesJson.length == 0){
                return [];
            }

            const packName = path.join(directoryToCheck,`${folder.name}`).replaceAll("/","-").replaceAll("\\","-")+".db";
            logger.info(`Set up pack name ${packName}`);
			const filePath = path.join(PACK_DEST, packName);
			fs.rmSync(filePath, { force: true });
			const db = fs.createWriteStream(filePath, { flags: "a", mode: 0o664 });
			const data = [];
			logger.info(`Compiling pack ${packName}`);
			return (
				gulp
					.src(path.join(directoryToCheck, folder.name, "/**/*.json"))
					// return gulp.src(path.join(PACK_SRC, folder.name, "/**/*.json"))
					.pipe(
						through2.obj(
							(file, enc, callback) => {
								const json = JSON.parse(file.contents.toString());
								cleanPackEntry(json);
								data.push(json);
								callback(null, file);
							},
							(callback) => {
								data.sort((lhs, rhs) => (lhs._id > rhs._id ? 1 : -1));
								data.forEach((entry) => db.write(`${JSON.stringify(entry)}\n`));
								callback();
							}
						)
					)
			);
		});
		packs.push(packsTmp);
	}
	return mergeStream(packs);
}
exports.compilePacks = compilePacks;

/* ----------------------------------------- */
/*  Extract Packs
    /* ----------------------------------------- */

/**
 * Extract the contents of compendium packs to JSON files.
 *
 * - `gulp extractPacks` - Extract all compendium NEDB files into JSON files.
 * - `gulp extractPacks --pack classes` - Only extract the contents of the specified compendium.
 * - `gulp extractPacks --pack classes --name Barbarian` - Only extract a single item from the specified compendium.
 */
function extractPacks() {
	const packName = parsedArgs.pack ?? "*";
	const entryName = parsedArgs.name?.toLowerCase();
    logger.info(`extractPack => packName = ${packName}`);
	const packs = gulp.src(`${PACK_DEST}/**/${packName}.db`).pipe(
		through2.obj((file, enc, callback) => {
			const filename = path.parse(file.path).name;
			// const folder = path.join(PACK_SRC, filename);
            const macroFolders = fs.readdirSync(PACK_SOURCES, { withFileTypes: true }).filter(file =>
                file.isDirectory()
            );
			for (const directoryToCheckTmp of macroFolders) {
                const directoryToCheck = path.join(PACK_SOURCES,directoryToCheckTmp.name);
				logger.info(`extractPacks => directoryToCheck = ${directoryToCheck}`);
				let folders = [];
				if (packName) {
					folders = fs
						.readdirSync(directoryToCheck, { withFileTypes: true })
						.filter((file) => file.isDirectory() && (!packName || packName === file.name));
				} else {
					folders = fs
						.readdirSync(directoryToCheck, { withFileTypes: true })
						.filter((file) => file.isDirectory());
				}
				for (const folder of folders) {
					logger.info(`extractPacks( => folder = ${folder}`);

					if (!fs.existsSync(folder)) {
						fs.mkdirSync(folder, { recursive: true, mode: 0o775 });
					}

					const db = new Datastore({ filename: file.path, autoload: true });
					db.loadDatabase();

					db.find({}, (err, entries) => {
						entries.forEach((entry) => {
							const name = entry.name.toLowerCase();
							if (entryName && entryName !== name) return;
							cleanPackEntry(entry);
							const output = `${JSON.stringify(entry, null, 2)}\n`;
							const outputName = name
								.replace("'", "")
								.replace(/[^a-z0-9]+/gi, " ")
								.trim()
								.replace(/\s+|-{2,}/g, "-");
							const subfolder = path.join(folder, _getSubfolderName(entry, filename));
							if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder, { recursive: true, mode: 0o775 });
                            logger.info(`Extracting pack  => writeFileSync = ${path.join(subfolder, `${outputName}.json`)} `);
							fs.writeFileSync(path.join(subfolder, `${outputName}.json`), output, { mode: 0o664 });
						});
					});

					logger.info(`Extracting pack ${filename}`);
					callback(null, file);
				}
			}
		})
	);

	return mergeStream(packs);
}
exports.extractPacks = extractPacks;

/**
 * Determine a subfolder name based on which pack is being extracted.
 * @param {object} data  Data for the entry being extracted.
 * @param {string} pack  Name of the pack.
 * @returns {string}     Subfolder name the entry into which the entry should be created. An empty string if none.
 * @private
 */
function _getSubfolderName(data, pack) {
	switch (pack) {
		// Items should be grouped by type
		case "items":
			if (data.type === "consumable" && data.system.consumableType) return data.system.consumableType;
			return data.type;

		// Monsters should be grouped by CR
		case "monsters":
			if (!data.system?.details?.type?.value) return "";
			return data.system.details.type.value;

		// Spells should be grouped by level
		case "spells":
			if (data.system?.level === undefined) return "";
			if (data.system.level === 0) return "cantrip";
			return `level-${data.system.level}`;

		default:
			return "";
	}
}

// ========================================================================

const gulpPackContent = () => {
	through2.obj((vinylFile, _, callback) => {
		//console.log('[1] vinylFile = ' + JSON.stringify(vinylFile));
		const transformedFile = vinylFile.clone();
		let fileName = transformedFile.path.substring(
			transformedFile.path.lastIndexOf("/"),
			transformedFile.path.lastIndexOf(".")
		);
		//console.log('[1] fileName = ' + fileName);
		//let jsonFilePath = `${transformedFile.base}/${fileName}.json`;
		let jsonFilePath = `${fileName}.json`;
		//console.log('[2] jsonFilePath = ' + jsonFilePath);
		const javascriptContent = new String(transformedFile.contents);
		//console.log('[2] javascriptContent = ' + javascriptContent);

		if (!fs.existsSync(jsonFilePath)) {
			jsonFilePath = `${transformedFile.base}/${fileName}.json`;
		}
		let fileNameTmp = fileName;
		if (fileNameTmp.includes("\\")) {
			fileNameTmp = transformedFile.path.substring(
				transformedFile.path.lastIndexOf("\\") + 1,
				fileNameTmp.length
			);
		}
		if (fileNameTmp.includes("/")) {
			fileNameTmp = transformedFile.path.substring(transformedFile.path.lastIndexOf("/") + 1, fileNameTmp.length);
		}
		//console.log('[3] fileNameTmp = ' + fileNameTmp);
		//console.log('[3] Read jsonFilePath = ' + jsonFilePath);
		const file = fs.readFileSync(jsonFilePath);
		const jsonContent = JSON.parse(file);
		//console.log('[4] Read jsonContent = ' + JSON.stringify(jsonContent));
		jsonContent.command = javascriptContent;
		jsonContent.name = fileNameTmp;
		//console.log('[5] Read jsonContent = ' + JSON.stringify(jsonContent));
		transformedFile.contents = Buffer.from(JSON.stringify(jsonContent));
		//console.log('[6] transformedFile.contents = ' + transformedFile.contents);
		// vinylFile.history = jsonFilePath;

		// console.log('[4] transformedFile = ' + transformedFile);
		callback(null, transformedFile);
	});
	// return Promise.resolve(`done`);
};
exports.gulpPackContent = gulpPackContent;

/**
 * Gulp foundryCompilePack task
 *  - Generate .db foundry files
 * @param {function} done Done callback function
 * @returns
 */
async function prepareJsons() {
	const packName = parsedArgs.pack ?? undefined;
	const entryName = parsedArgs.name?.toLowerCase() ?? undefined;
	logger.info(`prepareJsons => parsedArgs.pack = ${packName}`);
	logger.info(`prepareJsons => entryName = ${entryName}`);
    const macroFolders = fs.readdirSync(PACK_SOURCES, { withFileTypes: true }).filter(file =>
        file.isDirectory()
    );
    logger.info(`prepareJsons => macroFolders = ${macroFolders.length} => ${JSON.stringify(macroFolders[0])}`);
	for (const directoryToCheckTmp of macroFolders) {
        const directoryToCheck = path.join(PACK_SOURCES,directoryToCheckTmp.name);
		logger.info(`prepareJsons => directoryToCheck = ${directoryToCheck}`);

		let folders = [];
		if (packName) {
			folders = fs
				.readdirSync(directoryToCheck, { withFileTypes: true })
				.filter((file) => file.isDirectory() && (!packName || packName === file.name));
		} else {
			folders = fs.readdirSync(directoryToCheck, { withFileTypes: true }).filter((file) => file.isDirectory());
		}
		if (folders && folders.length > 0) {
			logger.info(`prepareJsons => folders ${JSON.stringify(folders[0])}`);
			const folderPath = path.join(directoryToCheck ,folders[0].name); // e.g. generic
			logger.info(`prepareJsons => folderPath = ${folderPath}`);
			const filesJs = fs.readdirSync(folderPath, { withFileTypes: true }).filter((file) => {
				// logger.info(file.name + " => " + path.extname(file.name));
				return !file.isDirectory() && path.extname(file.name).toLowerCase() === `.js`;
			});
			logger.info(`prepareJsons => filesJs ${filesJs?.length}`);
			const filesJson = fs.readdirSync(folderPath, { withFileTypes: true }).filter((file) => {
				// logger.info(file.name + " => " + path.extname(file.name));
				return !file.isDirectory() && path.extname(file.name).toLowerCase() === `.json`;
			});
			logger.info(`prepareJsons => filesJson ${filesJson?.length}`);
			logger.info(`Readed files`);
			const packs = folders.map((folder) => {
				logger.info(`Cleaning pack ${folder.name}`);
				filesJs.map((fileJs) => {
					const transformedFile = fileJs.name;
					let fileName = transformedFile.substring(
						transformedFile.lastIndexOf("/"),
						transformedFile.lastIndexOf(".")
					);
					let jsonFilePath = `${fileName}.json`;
					// logger.info(`prepareJsons => fileJs = ${fileName}`);
					// logger.info(`prepareJsons => fileJs = ${jsonFilePath}`);
					filesJson.map(async (fileJson) => {
						let fileNameJson = fileJson.name;
						// logger.info(`prepareJsons  => fileJson = ${fileNameJson}`);
						if (jsonFilePath === fileNameJson) {
							// logger.info(`prepareJsons => Found = ${fileNameJson}`);
							// logger.info(`prepareJsons => Load Js = ${folderPath+"/"+fileJs.name}`);
							const javascriptContent = new String(fs.readFileSync(folderPath + "/" + fileJs.name));
							// logger.info(`prepareJsons => Load Json = ${folderPath+"/"+fileJson.name}`);
							const jsonObj = JSON.parse(fs.readFileSync(folderPath + "/" + fileJson.name));
							// logger.info(`prepareJsons => fileJson.contents = ${JSON.stringify(jsonObj)}`);
							// logger.info(`prepareJsons  => cleanPackEntry(`);
							cleanPackEntry(jsonObj);
							// logger.info(`prepareJsons  => cleanedPackEntry(`);
							if (!jsonObj._id) {
                                logger.info(`prepareJsons  => determineId = ${folder.name}`);
								jsonObj._id = await determineId(jsonObj, folder.name);
							}
							jsonObj.command = javascriptContent;
							// fs.rmSync(fileJson.path, { force: true });
                            logger.info(`prepareJsons  => writeFileSync = ${folderPath + "/" + fileJson.name} `);
							fs.writeFileSync(
								folderPath + "/" + fileJson.name,
								`${JSON.stringify(jsonObj, null, 2)}\n`,
								{ mode: 0o664 }
							);
						}
					});
				});
			});
		}
	}
	return Promise.resolve(`done`);
}
exports.prepareJsons = prepareJsons;

/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data  Data for a single entry to clean.
 * @param {object} [options]
 * @param {boolean} [options.clearSourceId]  Should the core sourceId flag be deleted.
 */
function cleanPackEntry2(data, { clearSourceId = true } = {}) {
	if (data.ownership) data.ownership = { default: 0 };
	if (clearSourceId) delete data.flags?.core?.sourceId;
	delete data.flags?.importSource;
	delete data.flags?.exportSource;
	if (data._stats?.lastModifiedBy) data._stats.lastModifiedBy = "builder0000";

	// Remove empty entries in flags
	if (!data.flags) data.flags = {};
	Object.entries(data.flags).forEach(([key, contents]) => {
		if (Object.keys(contents).length === 0) delete data.flags[key];
	});

	if (data.effects) data.effects.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
	if (data.items) data.items.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
	if (data.system?.description?.value) data.system.description.value = cleanString(data.system.description.value);
	if (data.label) data.label = cleanString(data.label);
	if (data.name) data.name = cleanString(data.name);
	return Promise.resolve(`done`);
}

// ========================================================================

function getConfig() {
	const configPath = path.resolve(process.cwd(), `foundryconfig.json`);
	let config;

	if (fs.existsSync(configPath)) {
		config = loadJson(configPath);
		return config;
	} else {
		return;
	}
}

/* MOD 4535992
interface Manifest {
    root: string;
    file: ModuleData;
    name: string;
}
*/
const getManifest = () => {
	const json = {
		root: ``,
		// @ts-ignore
		file: {},
		name: ``,
	};

	if (fs.existsSync(`src`)) {
		json.root = `src`;
	} else {
		json.root = `dist`;
	}

	const modulePath = path.join(json.root, `module.json`);
	const systemPath = path.join(json.root, `system.json`);

	if (fs.existsSync(modulePath)) {
		json.file = loadJson(modulePath);
		json.name = `module.json`;
	} else if (fs.existsSync(systemPath)) {
		json.file = loadJson(systemPath);
		json.name = `system.json`;
	} else {
		return null;
	}

	// If we can pull our version from our package - saves us having to maintain the number in different places
	if (process.env.npm_package_version) {
		json.file[`version`] = process.env.npm_package_version;
	}
	return json;
};

const createTransformer = () => {
	/**
	 * @param {typescript.Node} node
	 */
	const shouldMutateModuleSpecifier = (node) => {
		if (!isImportDeclaration(node) && !isExportDeclaration(node)) return false;
		if (node.moduleSpecifier === undefined) return false;
		if (!isStringLiteral(node.moduleSpecifier)) return false;
		if (!node.moduleSpecifier.text.startsWith(`./`) && !node.moduleSpecifier.text.startsWith(`../`)) return false;

		return path.extname(node.moduleSpecifier.text) === ``;
	};

	return (context) => {
		return (node) => {
			function visitor(node) {
				if (shouldMutateModuleSpecifier(node)) {
					if (isImportDeclaration(node)) {
						const newModuleSpecifier = createLiteral(`${node.moduleSpecifier.text}.js`);
						return factory.updateImportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							node.importClause,
							newModuleSpecifier,
							undefined
						);
					} else if (isExportDeclaration(node)) {
						const newModuleSpecifier = createLiteral(`${node.moduleSpecifier.text}.js`);
						return factory.updateExportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							false,
							node.exportClause,
							newModuleSpecifier,
							undefined
						);
					}
				}
				return visitEachChild(node, visitor, context);
			}
			return visitNode(node, visitor);
		};
	};
};

const tsConfig = ts.createProject(`tsconfig.json`, {
	getCustomTransformers: (_program) => ({
		after: [createTransformer()],
	}),
});

/********************/
/*		BUILD		*/
/********************/

/**
 * Build TypeScript
 */
function buildTS() {
	return (
		gulp
			.src(`src/**/*.ts`)
			.pipe(tsConfig())

			// // eslint() attaches the lint output to the `eslint` property
			// // of the file object so it can be used by other modules.
			// .pipe(eslint())
			// // eslint.format() outputs the lint results to the console.
			// // Alternatively use eslint.formatEach() (see Docs).
			// .pipe(eslint.format())
			// // To have the process exit with an error code (1) on
			// // lint error, return the stream and pipe to failAfterError last.
			// .pipe(eslint.failAfterError())

			.pipe(gulp.dest(`dist`))
	);
}

// function buildTS() {
//     const debug = process.env.npm_lifecycle_event !== `package`;
//     const res = tsConfig.src()
//         .pipe(sourcemaps.init())
//         .pipe(tsConfig());

//     return res.js
//         .pipe(sourcemaps.write(``, { debug: debug, includeContent: true, sourceRoot: `./ts/src` }))
//         .pipe(gulp.dest(`dist`));
// }

/**
 * Build JavaScript
 */
function buildJS() {
	return (
		gulp
			.src(`src/**/*.js`)

			// // eslint() attaches the lint output to the `eslint` property
			// // of the file object so it can be used by other modules.
			// .pipe(eslint())
			// // eslint.format() outputs the lint results to the console.
			// // Alternatively use eslint.formatEach() (see Docs).
			// .pipe(eslint.format())
			// // To have the process exit with an error code (1) on
			// // lint error, return the stream and pipe to failAfterError last.
			// .pipe(eslint.failAfterError())

			.pipe(gulp.dest(`dist`))
	);
}

/**
 * Build Module JavaScript
 */
function buildMJS() {
	return (
		gulp
			.src(`src/**/*.mjs`)

			// // eslint() attaches the lint output to the `eslint` property
			// // of the file object so it can be used by other modules.
			// .pipe(eslint())
			// // eslint.format() outputs the lint results to the console.
			// // Alternatively use eslint.formatEach() (see Docs).
			// .pipe(eslint.format())
			// // To have the process exit with an error code (1) on
			// // lint error, return the stream and pipe to failAfterError last.
			// .pipe(eslint.failAfterError())

			.pipe(gulp.dest(`dist`))
	);
}

/**
 * Build Css
 */
function buildCSS() {
	return gulp.src(`src/**/*.css`).pipe(gulp.dest(`dist`));
}

/**
 * Build Less
 */
function buildLess() {
	return gulp.src(`src/**/*.less`).pipe(less()).pipe(gulp.dest(`dist`));
}

/**
 * Build SASS
 */
function buildSASS() {
	return gulp.src(`src/**/*.scss`).pipe(sass().on(`error`, sass.logError)).pipe(gulp.dest(`dist`));
}

const bundleModule = async () => {
	const debug = argv.dbg || argv.debug;
	const bsfy = browserify(path.join(__dirname, mainFilePath), { debug: debug });
	return bsfy
		.on(`error`, console.error)
		.plugin(tsify)
		.bundle()
		.pipe(source(path.join(`dist`, `bundle.js`)))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sourcemaps.write(`./`))
		.pipe(gulp.dest(`./`));

	// await Promise.resolve(`bundleModule done`);
};

const copyFiles = async () => {
	const statics = [
		`lang`,
		`languages`,
		`fonts`,
		`assets`,
		`icons`,
		`templates`,
		`packs`,
		`module.json`,
		`system.json`,
		`template.json`,
	];

	const recursiveFileSearch = (dir, callback) => {
		const err = callback.err;
		const res = callback.res;
		let results = [];
		fs.readdir(dir, (err, list) => {
			if (err) return callback(err, results);

			let pending = list.length;
			if (!pending) return callback(null, results);

			for (let file of list) {
				file = path.resolve(dir, file);
				fs.stat(file, (err, stat) => {
					if (stat && stat.isDirectory()) {
						recursiveFileSearch(file, (err, res) => {
							results = results.concat(res);
							if (!--pending) callback(null, results);
						});
					} else {
						results.push(file);
						if (!--pending) callback(null, results);
					}
				});
			}
		});
	};
	console.log(`files:` + statics);
	try {
		for (const entity of statics) {
			const p = path.join(`src`, entity);
			/* MOD 4535992
            let p:string|null = null;
            if (entity.endsWith(`module.json`) || entity.endsWith(`templates`) || entity.endsWith(`lang`)) {
              p = path.join(`src`, entity);
            } else {
              p = path.join(`assets`, entity);
            }
            */
			if (fs.existsSync(p)) {
				if (fs.lstatSync(p).isDirectory())
					recursiveFileSearch(p, (err, res) => {
						if (err) throw err;

						for (const file of res) {
							const newFile = path.join(
								`dist`,
								path.relative(process.cwd(), file.replace(/src[\/\\]/g, ``))
							);
							console.log(`Copying file: ` + newFile);
							const folder = path.parse(newFile).dir;
							if (!fs.existsSync(folder)) {
								fs.mkdirSync(folder, { recursive: true });
							}
							fs.copyFileSync(file, newFile);
						}
					});
				else {
					console.log(`Copying file: ` + p + ` to ` + path.join(`dist`, entity));
					fs.copyFileSync(p, path.join(`dist`, entity));
				}
			}
		}
		return Promise.resolve();
	} catch (err) {
		await Promise.reject(err);
	}
};

const cleanDist = async () => {
	if (argv.dbg || argv.debug) {
		return;
	}
	console.log(`Cleaning dist file clutter`);

	const files = [];
	const getFiles = async (dir) => {
		const arr = await fs.promises.readdir(dir);
		for (const entry of arr) {
			const fullPath = path.join(dir, entry);
			const stat = await fs.promises.stat(fullPath);
			if (stat.isDirectory()) await getFiles(fullPath);
			else files.push(fullPath);
		}
	};

	await getFiles(path.resolve(`./dist`));
	for (const file of files) {
		/* MOD 4535992
        if (file.endsWith(`bundle.js`) ||
            file.endsWith(`.css`) ||
            file.endsWith(`module.json`) ||
            file.endsWith(`templates`) ||
            file.endsWith(`lang`)||
            file.endsWith(`.json`) ||
            file.endsWith(`.html`)){
            continue;
        }
        */
		console.warn(`Cleaning ` + path.relative(process.cwd(), file));
		await fs.promises.unlink(file);
	}
};

/**
 * Watch for changes for each build step
 */
const buildWatch = () => {
	// gulp.watch(`src/**/*.ts`, { ignoreInitial: false }, gulp.series(buildTS, bundleModule));
	gulp.watch(`src/**/*.ts`, { ignoreInitial: false }, gulp.series(buildTS));
	gulp.watch(`src/**/*.less`, { ignoreInitial: false }, buildLess);
	gulp.watch(`src/**/*.sass`, { ignoreInitial: false }, buildSASS);
	gulp.watch(
		[`src/fonts`, `src/lang`, `src/languages`, `src/templates`, `src/*.json`],
		{ ignoreInitial: false },
		copyFiles
	);
};

/********************/
/*		CLEAN		*/
/********************/

/**
 * Remove built files from `dist` folder
 * while ignoring source files
 */
const clean = async () => {
	if (!fs.existsSync(`dist`)) {
		fs.mkdirSync(`dist`);
	}

	const name = path.basename(path.resolve(`.`));
	const files = [];

	// If the project uses TypeScript
	// if (fs.existsSync(path.join(`src`, mainFilePath))) { // MOD 4535992
	files.push(
		`lang`,
		`languages`,
		`fonts`,
		`icons`,
		`packs`,
		`templates`,
		`assets`,
		`module`,
		`index.js`,
		`module.json`,
		`system.json`,
		`template.json`
	);
	// } // MOD 4535992

	// If the project uses Less
	/* MOD 4535992
    // if (fs.existsSync(path.join(`src/styles/`, `${name}.less`))) {
    //     files.push(`fonts`, `${name}.css`);
    // }
    */
	// Attempt to remove the files
	try {
		for (const filePath of files) {
			if (fs.existsSync(path.join(`dist`, filePath))) {
				// fs.unlinkSync(path.join(`dist`, filePath)); // MOD 4535992
				fs.rmSync(path.join(`dist`, filePath), { recursive: true, force: true });
			}
		}
		return Promise.resolve();
	} catch (err) {
		await Promise.reject(err);
	}
};

const linkUserData = async () => {
	const name = getManifest()?.file.name;
	const config = loadJson(`foundryconfig.json`);

	let destDir;
	try {
		if (
			fs.existsSync(path.resolve(`.`, `dist`, `module.json`)) ||
			fs.existsSync(path.resolve(`.`, `src`, `module.json`))
		) {
			destDir = `modules`;
		} else {
			throw Error(`Could not find module.json or system.json`);
		}

		let linkDir;
		if (config.dataPath) {
			if (!fs.existsSync(path.join(config.dataPath, `Data`)))
				throw Error(`User Data path invalid, no Data directory found`);

			linkDir = path.join(config.dataPath, `Data`, destDir, name);
		} else {
			throw Error(`No User Data path defined in foundryconfig.json`);
		}

		if (argv.clean || argv.c) {
			console.warn(`Removing build in ${linkDir}`);

			fs.unlinkSync(linkDir);
		} else if (!fs.existsSync(linkDir)) {
			console.log(`Copying build to ${linkDir}`);
			fs.symlinkSync(path.resolve(`./dist`), linkDir);
		}
		return Promise.resolve();
	} catch (err) {
		await Promise.reject(err);
	}
};

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Package build
 */
async function packageBuild() {
	const manifest = getManifest();
	if (manifest === null) {
		console.error(`Manifest file could not be loaded.`);
		throw Error();
	}

	return new Promise((resolve, reject) => {
		try {
			// Remove the package dir without doing anything else
			if (argv.clean || argv.c) {
				console.warn(`Removing all packaged files`);
				fs.rmSync(`package`, { force: true, recursive: true });
				return;
			}

			// Ensure there is a directory to hold all the packaged versions
			// fs.existsSync(`package`);
			if (!fs.existsSync(`package`)) {
				fs.mkdirSync(`package`, { recursive: true });
			}

			// Initialize the zip file
			const zipName = `module.zip`; // `${manifest.file.name}-v${manifest.file.version}.zip`; // MOD 4535992
			const zipFile = fs.createWriteStream(path.join(`package`, zipName));
			//@ts-ignore
			const zip = archiver(`zip`, { zlib: { level: 9 } });

			zipFile.on(`close`, () => {
				console.log(zip.pointer() + ` total bytes`);
				console.log(`Zip file ${zipName} has been written`);
				return resolve(true);
			});

			zip.on(`error`, (err) => {
				throw err;
			});

			zip.pipe(zipFile);

			// Add the directory with the final code
			// zip.directory(`dist/`, manifest.file.name);
			const moduleJson = JSON.parse(fs.readFileSync("./src/module.json"));
			zip.directory(`dist/`, moduleJson.id);
			/* MOD 4535992
            zip.file(`dist/module.json`, { name: `module.json` });
            zip.file(`dist/bundle.js`, { name: `bundle.js` });
            zip.glob(`dist/*.css`, {cwd:__dirname});
            zip.directory(`dist/lang`, `lang`);
            zip.directory(`dist/templates`, `templates`);
            */
			console.log(`Zip files`);

			zip.finalize();
			return resolve(`done`);
		} catch (err) {
			return reject(err);
		}
	});
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Update version and URLs in the manifest JSON
 */
const updateManifest = (cb) => {
	const packageJson = loadJson(`package.json`);
	const config = getConfig(),
		manifest = getManifest(),
		rawURL = config.rawURL,
		repoURL = config.repository,
		manifestRoot = manifest?.root;

	if (!config) {
		cb(Error(`foundryconfig.json not found`));
	}
	if (manifest === null) {
		cb(Error(`Manifest JSON not found`));
		return;
	}
	if (!rawURL || !repoURL) {
		cb(Error(`Repository URLs not configured in foundryconfig.json`));
	}
	try {
		const version = argv.update || argv.u;

		/* Update version */

		const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})$/;
		const currentVersion = manifest?.file.version;
		let targetVersion = ``;

		if (!version) {
			cb(Error(`Missing version number`));
		}

		if (versionMatch.test(version)) {
			targetVersion = version;
		} else {
			targetVersion = currentVersion.replace(versionMatch, (substring, major, minor, patch) => {
				console.log(substring, Number(major) + 1, Number(minor) + 1, Number(patch) + 1);
				if (version === `major`) {
					return `${Number(major) + 1}.0.0`;
				} else if (version === `minor`) {
					return `${major}.${Number(minor) + 1}.0`;
				} else if (version === `patch`) {
					return `${major}.${minor}.${Number(patch) + 1}`;
				} else {
					return ``;
				}
			});
		}

		if (targetVersion === ``) {
			return cb(Error(`Error: Incorrect version arguments.`));
		}

		if (targetVersion === currentVersion) {
			return cb(Error(`Error: Target version is identical to current version.`));
		}

		console.log(`Updating version number to "${targetVersion}"`);

		packageJson.version = targetVersion;
		manifest.file.version = targetVersion;

		/* Update URLs */

		const result = `${repoURL}/releases/download/${manifest.file.version}/module.zip`;

		manifest.file.url = repoURL;
		manifest.file.manifest = `${rawURL}/${manifest.file.version}/${manifestRoot}/${manifest.name}`;
		manifest.file.download = result;

		const prettyProjectJson = stringify(manifest.file, {
			maxLength: 35,
			indent: `\t`,
		});

		fs.writeFileSync(`package.json`, JSON.stringify(packageJson, null, `\t`));
		fs.writeFileSync(path.join(manifest.root, manifest.name), prettyProjectJson, `utf8`);

		return cb();
	} catch (err) {
		cb(err);
	}
};
const test = () => {
	return gulp.src(`src/__tests__`).pipe(
		jest({
			preprocessorIgnorePatterns: [`dist/`, `node_modules/`],
			automock: false,
		})
	);
};

// const execBuild = gulp.parallel(buildTS, buildLess, copyFiles); // MOD 4535992
const execBuild = gulp.parallel(buildTS, buildJS, buildMJS, buildCSS, buildLess, buildSASS, copyFiles);

// exports.build = gulp.series(clean, execBuild, importDocumentsToDb);
exports.build = gulp.series(clean, prepareJsons, cleanPacks, compilePacks, execBuild); // extractPacks
exports.bundle = gulp.series(clean, execBuild, bundleModule, cleanDist);
exports.watch = buildWatch;
exports.clean = clean;
// exports.postClean = deleteDocuments;
exports.link = linkUserData;
exports.package = packageBuild;
exports.update = updateManifest;
exports.publish = gulp.series(clean, updateManifest, execBuild, bundleModule, cleanDist, packageBuild);
