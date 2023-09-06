import { detect as proxyDetect } from '../util/proxy.js';
import prompts from 'prompts';
import chalk from 'chalk';
import { expand } from './expand.js';
import { existsSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { BusyIndicator } from '../util/busyindicator.js';
import { detect } from '../util/detect.js';
import { request } from '../util/request.js';
import * as version from '../util/version.js';
import { detectTitaniumSDKs, getReleases } from './tisdk.js';
import dns from 'node:dns/promises';
import tmp from 'tmp';
import { join } from 'node:path';

const { bold, cyan, gray, green, magenta, red, yellow } = chalk;
const { prompt } = prompts;

export class SetupScreens {
	proxy = [];

	screens = {
		quick: {
			label: '__q__uick',
			desc: 'Quick Setup'
		},
		check: {
			label: 'chec__k__',
			desc: 'Check Environment'
		},
		user: {
			label: '__u__ser',
			desc: 'User Information'
		},
		app: {
			label: 'a__p__p',
			desc: 'New App Defaults'
		},
		network: {
			label: '__n__etwork',
			desc: 'Network Settings'
		},
		cli: {
			label: '__c__li',
			desc: 'Titanium CLI Settings'
		},
		android: {
			label: '__a__ndroid',
			desc: 'Android Settings'
		},
		ios: {
			label: '__i__os',
			desc: 'iOS Settings'
		}
	};

	constructor(logger, config, cli) {
		this.logger = logger;
		this.config = config;
		this.cli = cli;
	}

	async run() {
		const p = await proxyDetect();
		if (p) {
			this.proxy.push(p);
		}

		let next = this.cli.argv._[0] || 'mainmenu';
		let screen;
		while (screen = this[`${next}Screen`]) {
			next = (await screen.call(this)) || 'mainmenu';
			this.logger.trace(`Next screen: ${next}`);
		}
	}

	async mainmenuScreen() {
		const screens = Object.keys(this.screens).filter(name => name !== 'ios' || process.platform === 'darwin');

		const lookup = {
			[screens.length + 1]: 'exit',
			exit: 'exit',
			x: 'exit'
		};

		this.logger.log(
			screenTitle('Main Menu') + '\n' +
			screens
				.map((name, i) => {
					const { label, desc } = this.screens[name];
					const padding = 7 - (label.length - 4);
					const title = cyan(
						label.replace(/__(.+)__/, (_s, char) => {
							lookup[char] = name;
							return bold(char);
						}) +
						(padding > 0 ? ' '.repeat(padding) : '')
					);
					lookup[name] = lookup[i + 1] = name;
					return `${String(i + 1).padStart(4)})  ${title}  ${desc}`;
				})
				.join('\n') +
			`\n${String(screens.length + 1).padStart(4)})  ${cyan(
				'e__x__it'.replace(/__(.+)__/, (_s, char) => bold(char)))
			}     Exit`
		);

		const { value } = await prompt({
			type: 'text',
			message: 'Where do you want to go?',
			name: 'value'
		});

		const next = lookup[value];
		if (!next || next === 'exit') {
			process.exit(0);
		}
		return next;
	}

	async quickScreen() {
		this.logger.log(screenTitle('Quick Setup'));

		let data;
		const busy = new BusyIndicator();
		busy.start();

		try {
			({ data } = await detect(this.logger, this.config, this.cli, { all: true }));
		} finally {
			busy.stop();
		}

		const values = await prompt([
			{
				type: 'text',
				message: 'What do you want as your "author" name?',
				initial: this.config.get('user.name', ''),
				name: 'name'
			},
			{
				type: 'text',
				message: 'Path to your workspace where your projects should be created:',
				initial: this.config.get('app.workspace', ''),
				name: 'workspace',
				validate: value => {
					if (!value) {
						return 'Please specify a workspace directory';
					}
					value = expand(value);
					if (!existsSync(value)) {
						return 'Specified workspace directory does not exist'
					}
					return true;
				}
			},
			{
				type: 'toggle',
				message: 'Do you plan to build your app for Android?',
				initial: true,
				name: 'usingAndroid',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: prev => prev ? 'text' : null,
				message: 'Path to the Android SDK',
				initial: this.config.get('android.sdkPath', data?.android.sdk?.path),
				name: 'androidSdkPath',
				validate: value => {
					if (!value) {
						return 'Please specify the Android SDK directory';
					}
					value = expand(value);
					if (!existsSync(value)) {
						return 'Specified Android SDK directory does not exist'
					}
					if (process.platform === 'win32' && value.includes('&')) {
						return 'The Android SDK path must not contain ampersands (&) on Windows';
					}
					const adbExecutable = join(value, 'platform-tools', 'adb' + (process.platform === 'win32' ? '.exe' : ''));
					if (!existsSync(adbExecutable)) {
						return 'Invalid Android SDK path: adb not found';
					}
					return true;
				}
			}
		]);

		this.config.set('user.name', values.name);
		this.config.set('app.workspace', values.workspace);
		if (values.androidSdkPath !== undefined) {
			this.config.set('android.sdkPath', values.androidSdkPath);
		}
		this.config.save();
		this.logger.log('\nConfiguration saved!');
	}

	async checkScreen() {
		this.logger.log(screenTitle('Check Environment'));

		let data;
		const busy = new BusyIndicator();
		busy.start();

		let online = true;
		try {
			await dns.resolve('github.com');
		} catch {
			online = false;
		}

		try {
			({ data } = await detect(this.logger, this.config, this.cli, { all: true }));

			data.titaniumCLI.latest = await request('https://registry.npmjs.org/-/package/titanium/dist-tags')
				.then(res => res.body.json())
				.then(r => r.latest);

			data.titaniumSDK = {
				installed: await detectTitaniumSDKs(this.config),
				latest: online && (await getReleases())?.[0] || null
			};

			data.network = {
				online,
				proxy: this.config.get('cli.httpProxyServer'),
				test: !!data.titaniumSDK.latest?.name
			};
		} finally {
			busy.stop();
		}

		const log = (...args) => this.logger.log(...args);
		let labelPadding = 18;
		const checkmark = '✓';
		const starmark = '\u2605';
		const xmark = '\u2715';
		const ok = (label, status, extra) => {
			log(`  ${green(checkmark)}  ${label.padEnd(labelPadding)} ${status ? green(status) : ''}${extra ? gray(` ${extra}`) : ''}`);
		};
		const warn = (label, status, extra) => {
			log(`  ${bold(yellow('!'))}  ${label.padEnd(labelPadding)} ${status ? yellow(status) : ''}${extra ? gray(` ${extra}`) : ''}`);
		};
		const bad = (label, status, extra) => {
			log(`  ${red(xmark)}  ${label.padEnd(labelPadding)} ${status ? red(status) : ''}${extra ? gray(` ${extra}`) : ''}`);
		};
		const update = (label, status, extra) => {
			log(`  ${magenta(starmark)}  ${label.padEnd(labelPadding)} ${status ? magenta(status) : ''}${extra ? gray(` ${extra}`) : ''}`);
		};
		const note = (label, status, extra) => {
			log(`  ${bold(gray('-'))}  ${label.padEnd(labelPadding)} ${status ? gray(status) : ''}${extra ? gray(` ${extra}`) : ''}`);
		};

		log('Node.js');
		ok('node', 'installed', '(v' + data.node.version + ')');
		ok('npm', 'installed', '(v' + data.npm.version + ')');
		log();

		log('Titanium CLI');
		if (data.titaniumCLI.latest === null) {
			note('cli', `(v${data.titaniumCLI.version})`);
		} else if (data.titaniumCLI.latest === data.titaniumCLI.version) {
			ok('cli', 'up-to-date', `(v${data.titaniumCLI.version})`);
		} else if (version.gt(data.titaniumCLI.version, data.titaniumCLI.latest)) {
			ok('cli', 'bleeding edge', `(v${data.titaniumCLI.version})`);
		} else {
			update('cli', `new version v${data.titaniumCLI.latest} available`, `(currently v${data.titaniumCLI.version})`);
		}
		log();

		log('Titanium SDK');
		if (data.titaniumSDK.latest === null) {
			note('latest sdk', 'unknown (offline)');
		} else if (!data.titaniumSDK.installed.sdks.length) {
			bad('latest sdk', 'no Titanium SDKs found');
		} else if (data.titaniumSDK.installed.sdks.find(s => s.name === data.titaniumSDK.latest.name)) {
			ok('latest sdk', 'installed', `(v${data.titaniumSDK.latest.name})`);
		} else {
			update('latest sdk', `new version v${data.titaniumSDK.latest.name} available!`);
		}
		log();

		if (process.platform === 'darwin') {
			log('iOS Environment');
// 				const distPPLabel = 'dist provisioning';
// 				const len = distPPLabel.length;

// 				if (Object.keys(r.xcode).length) {
// 					ok('Xcode'.padEnd(len), 'installed', '(' + Object.keys(r.xcode).filter(function (ver) {
// 						return ver !== '__selected__';
// 					}).map(function (ver) {
// 						return r.xcode[ver].version;
// 					}).sort().join(', ') + ')');

// 					const iosSdks = {};
// 					Object.keys(r.xcode).forEach(function (ver) {
// 						if (ver !== '__selected__') {
// 							r.xcode[ver].sdks.forEach(function (v) {
// 								iosSdks[v] = 1;
// 							});
// 						}
// 					});
// 					if (Object.keys(iosSdks).length) {
// 						ok(appc.string.rpad(__('iOS SDK'), len), __('installed'), '(' + Object.keys(iosSdks).sort().join(', ') + ')');
// 					} else {
// 						warn(appc.string.rpad(__('iOS SDK'), len), __('no iOS SDKs found'));
// 					}
// 				} else {
// 					warn(appc.string.rpad('Xcode', len), __('no Xcode installations found'));
// 					warn(appc.string.rpad(__('iOS SDK'), len), __('no Xcode installations found'));
// 				}

// 				if (r.certs.wwdr) {
// 					ok(appc.string.rpad(__('WWDR cert'), len), __('installed'));
// 				} else {
// 					warn(appc.string.rpad(__('WWDR cert'), len), __('not found'));
// 				}

// 				let devCerts = 0;
// 				let distCerts = 0;

// 				Object.keys(r.certs.keychains).forEach(function (keychain) {
// 					if (r.certs.keychains[keychain].developer) {
// 						r.certs.keychains[keychain].developer.forEach(function (i) {
// 							if (!Object.prototype.hasOwnProperty.call(i, 'invalid') || i.invalid === false) {
// 								devCerts++;
// 							}
// 						});
// 					}
// 					if (r.certs.keychains[keychain].distribution) {
// 						r.certs.keychains[keychain].distribution.forEach(function (i) {
// 							if (!Object.prototype.hasOwnProperty.call(i, 'invalid') || i.invalid === false) {
// 								distCerts++;
// 							}
// 						});
// 					}
// 				});

// 				if (devCerts) {
// 					ok(appc.string.rpad(__('developer cert'), len), __('installed'), __('(%s found)', devCerts));
// 				} else {
// 					warn(appc.string.rpad(__('developer cert'), len), __('not found'));
// 				}

// 				if (distCerts) {
// 					ok(appc.string.rpad(__('distribution cert'), len), __('installed'), __('(%s found)', distCerts));
// 				} else {
// 					warn(appc.string.rpad(__('distribution cert'), len), __('not found'));
// 				}

// 				var devPP = r.provisioningProfiles.development.filter(function (i) {
// 					return !Object.prototype.hasOwnProperty.call(i, 'expired') || i.expired === false;
// 				}).length;
// 				if (devPP) {
// 					ok(appc.string.rpad(__('dev provisioning'), len), __('installed'), __('(%s found)', devPP));
// 				} else {
// 					warn(appc.string.rpad(__('dev provisioning'), len), __('not found'));
// 				}

// 				var distPP = r.provisioningProfiles.distribution.filter(function (i) {
// 					return !Object.prototype.hasOwnProperty.call(i, 'expired') || i.expired === false;
// 				}).length + r.provisioningProfiles.adhoc.filter(function (i) {
// 					return !Object.prototype.hasOwnProperty.call(i, 'expired') || i.expired === false;
// 				}).length;
// 				if (distPP) {
// 					ok(distPPLabel, __('installed'), __('(%s found)', distPP));
// 				} else {
// 					warn(distPPLabel, __('not found'));
// 				}
			log();
		}

		log('Android Environment');
		if (data.android.sdk?.path) {
			ok('sdk', 'installed', `(${data.android.sdk.path})`);

			if (data.android.sdk.platformTools && data.android.sdk.platformTools.path) {
				if (data.android.sdk.platformTools.supported === 'maybe') {
					warn('platform tools', `untested version ${data.android.sdk.platformTools.version}; may or may not work`);
				} else if (data.android.sdk.platformTools.supported) {
					ok('platform tools', 'installed', `(v${data.android.sdk.platformTools.version})`);
				} else {
					bad('platform tools', `unsupported version ${data.android.sdk.platformTools.version}`);
				}
			}

			if (data.android.sdk.buildTools && data.android.sdk.buildTools.path) {
				if (data.android.sdk.buildTools.supported === 'maybe') {
					warn('build tools', `untested version ${data.android.sdk.buildTools.version}; may or may not work`);
				} else if (data.android.sdk.buildTools.supported) {
					ok('build tools', 'installed', `(v${data.android.sdk.buildTools.version})`);
				} else {
					bad('build tools', `unsupported version ${data.android.sdk.buildTools.version}`);
				}
			}

			if (data.android.sdk.executables) {
				if (data.android.sdk.executables.adb) {
					ok('adb', 'installed', data.android.sdk.executables.adb);
				} else {
					bad('adb', '"adb" executable not found; please reinstall Android SDK');
				}
				if (data.android.sdk.executables.emulator) {
					ok('emulator', 'installed', data.android.sdk.executables.emulator);
				} else {
					bad('emulator', '"emulator" executable not found; please reinstall Android SDK');
				}
			}
		} else {
			warn('sdk', 'Android SDK not found');
		}

		if (data.android.targets && Object.keys(data.android.targets).length) {
			ok('targets', 'installed', `(${Object.keys(data.android.targets).length} found)`);
		} else {
			warn('targets', 'no targets found');
		}

		if (data.android.emulators?.length) {
			ok('emulators', 'installed', `(${data.android.emulators.length} found)`);
		} else {
			warn('emulators', 'no emulators found');
		}

		if (data.android.ndk) {
			ok('ndk', 'installed', `(${data.android.ndk.version})`);
			if (data.android.ndk.executables) {
				ok('ndk-build', 'installed', `(${data.android.ndk.executables.ndkbuild})`);
			}
		} else {
			warn('ndk', 'Android NDK not found');
		}

		log(); // end android

		log('Java Development Kit');
		if (data.jdk.version == null) { // eslint-disable-line
			bad('jdk', 'JDK not found!');
		} else {
			ok('jdk', 'installed', `(v${data.jdk.version})`);

			if (data.jdk.executables.java) {
				ok('java', 'installed', data.jdk.executables.java);
			} else {
				bad('java', '"java" executable not found; please reinstall JDK 1.6');
			}
			if (data.jdk.executables.javac) {
				ok('javac', 'installed', data.jdk.executables.javac);
			} else {
				bad('javac', '"javac" executable not found; please reinstall JDK 1.6');
			}
			if (data.jdk.executables.keytool) {
				ok('keytool', 'installed', data.jdk.executables.keytool);
			} else {
				bad('keytool', '"keytool" executable not found; please reinstall JDK 1.6');
			}
		}
		log();

		log('Network');
		if (data.network.online) {
			ok('online');
		} else {
			warn('offline');
		}
		if (data.network.proxy) {
			ok('proxy server enabled', data.network.proxy);
		} else {
			note('no proxy server configured');
		}
		if (data.network.online) {
			if (data.network.test) {
				ok('Network connection test');
			} else {
				bad('github.com is unreachable');
			}
		} else {
			note('Network connection test');
		}
		log();

		log('Directory Permissions');
		labelPadding = 31;
		const dirs = [
			[ '~', 'home directory' ],
			[ '~/.titanium', 'titanium config directory' ],
			[ this.cli.env.installPath, 'titanium sdk install directory' ],
			[ this.config.get('app.workspace'), 'workspace directory' ],
			[ tmp.tmpdir, 'temp directory' ]
		];
		for (let [dir, desc] of dirs) {
			if (dir) {
				dir = isDirWritable(dir);
				if (dir) {
					if (isDirWritable(dir)) {
						ok(desc, dir);
					} else {
						bad(desc, `"${dir}" not writable, check permissions and owner`);
					}
				} else {
					warn(desc, `"${dir}" does not exist`);
				}
			}
		}
	}

	async userScreen() {
		this.logger.log(screenTitle('User'));

		const { name } = await prompt({
			type: 'text',
			message: 'What do you want as your "author" name?',
			initial: this.config.get('user.name', ''),
			name: 'name'
		});

		if (name) {
			this.config.set('user.name', name);
			this.config.save();
			this.logger.log('\nConfiguration saved!');
		}
	}

	async appScreen() {
		this.logger.log(screenTitle('New App Defaults'));

		const values = await prompt([
			{
				type: 'text',
				message: 'Path to your workspace where your projects should be created:',
				initial: this.config.get('app.workspace', ''),
				name: 'workspace',
				validate: value => {
					if (!value) {
						return 'Please specify a workspace directory';
					}
					value = expand(value);
					if (!existsSync(value)) {
						return 'Specified workspace directory does not exist'
					}
					return true;
				}
			},
			{
				type: 'text',
				message: 'What is your prefix for application IDs? (example: com.mycompany)',
				initial: this.config.get('app.idprefix'),
				name: 'idprefix'
			},
			{
				type: 'text',
				message: 'What is the name of your organization to use as the "publisher"?',
				initial: this.config.get('app.publisher'),
				name: 'publisher'
			},
			{
				type: 'text',
				message: 'What is the URL of your organization?',
				initial: this.config.get('app.url'),
				name: 'url'
			}
		]);

		this.config.set('app.workspace', values.workspace);
		this.config.set('app.idprefix', values.idprefix);
		this.config.set('app.publisher', values.publisher);
		this.config.set('app.url', values.url);
		this.config.save();
		this.logger.log('\nConfiguration saved!');
	}

	async networkScreen() {
		this.logger.log(screenTitle('Network Settings'));

		let defaultProxy = this.config.get('cli.httpProxyServer', undefined);
		if (!defaultProxy) {
			for (const proxy of this.proxy) {
				if (proxy.valid) {
					defaultProxy = proxy.fullAddress;
					break;
				}
			}
		}

		const values = await prompt([
			{
				type: 'toggle',
				message: 'Are you behind a proxy server?',
				initial: !!this.config.get('cli.httpProxyServer'),
				name: 'hasProxy',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: prev => prev ? 'text' : null,
				message: 'Proxy server URL',
				initial: defaultProxy,
				name: 'httpProxyServer',
				validate: value => {
					try {
						const u = new URL(value);
						if (!/^https?:$/.test(u.protocol)) {
							return 'HTTP proxy url protocol must be either "http" or "https" (ex: http://user:pass@example.com)';
						}
						if (!(u.host || '')) {
							return 'HTTP proxy url must contain a host name (ex: http://user:pass@example.com)';
						}
						return true;
					} catch (e) {
						return e.message;
					}
				}
			},
			{
				type: 'toggle',
				message: 'Verify server (SSL) certificates against known certificate authorities?',
				initial: !!this.config.get('cli.rejectUnauthorized'),
				name: 'rejectUnauthorized',
				active: 'yes',
				inactive: 'no'
			}
		]);

		this.config.set('cli.httpProxyServer', values.hasProxy ? values.httpProxyServer : '');
		this.config.set('cli.rejectUnauthorized', values.rejectUnauthorized);
		this.config.save();
		this.logger.log('\nConfiguration saved!');
	}

	async cliScreen() {
		this.logger.log(screenTitle('Titanium CLI Settings'));

		const logLevels = this.logger.getLevels().reverse();

		const values = await prompt([
			{
				type: 'toggle',
				message: 'Enable colors?',
				initial: this.config.get('cli.colors', true),
				name: 'colors',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: 'toggle',
				message: 'Enable interactive prompting for missing options and arguments?',
				initial: this.config.get('cli.prompt', true),
				name: 'prompt',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: 'toggle',
				message: 'Display progress bars when downloading or installing?',
				initial: this.config.get('cli.progressBars', true),
				name: 'progressBars',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: 'select',
				message: 'Output log level',
				initial: logLevels.indexOf(this.config.get('cli.logLevel', 'info')),
				name: 'logLevel',
				choices: this.logger.getLevels().reverse().map(level => {
					return {
						title: level,
						value: level
					};
				})
			},
			{
				type: 'number',
				message: 'What is the width of the Titanium CLI output?',
				initial: this.config.get('cli.width', 80),
				name: 'width',
				validate: value => {
					return value !== '' && value < 1 ? 'Please enter a positive number' : true;
				}
			}
		]);

		this.logger.setLevel(values.logLevel);

		this.config.set('cli.colors', values.colors);
		this.config.set('cli.prompt', values.prompt);
		this.config.set('cli.progressBars', values.progressBars);
		this.config.set('cli.logLevel', values.logLevel);
		this.config.set('cli.width', values.width);
		this.config.save();
		this.logger.log('\nConfiguration saved!');
	}

	async androidScreen() {
		this.logger.log(screenTitle('Android Settings'));

		let data;
		const busy = new BusyIndicator();
		busy.start();

		try {
			({ data } = await detect(this.logger, this.config, this.cli, { all: true }));
		} finally {
			busy.stop();
		}

		const values = await prompt([
			{
				type: 'text',
				message: 'Path to the Android SDK',
				initial: this.config.get('android.sdkPath', data?.android.sdk?.path),
				name: 'androidSdkPath',
				validate: value => {
					if (!value) {
						return 'Please specify the Android SDK directory';
					}
					value = expand(value);
					if (!existsSync(value)) {
						return 'Specified Android SDK directory does not exist'
					}
					if (process.platform === 'win32' && value.includes('&')) {
						return 'The Android SDK path must not contain ampersands (&) on Windows';
					}
					const adbExecutable = join(value, 'platform-tools', `adb${process.platform === 'win32' ? '.exe' : ''}`);
					if (!existsSync(adbExecutable)) {
						return 'Invalid Android SDK path: adb not found';
					}
					return true;
				}
			},
			{
				type: 'toggle',
				message: 'Do you plan to build native Titanium Modules?',
				initial: false,
				name: 'modules',
				active: 'yes',
				inactive: 'no'
			},
			{
				type: prev => prev ? 'text' : null,
				message: 'Path to the Android NDK',
				initial: this.config.get('android.ndkPath', data?.android.ndk?.path),
				name: 'androidNdkPath',
				validate: value => {
					if (!value) {
						return 'Please specify the Android NDK directory';
					}
					value = expand(value);
					if (!existsSync(value)) {
						return 'Specified Android NDK directory does not exist'
					}
					const ndkbuildExecutable = join(value, `ndk-build${process.platform === 'win32' ? '.cmd' : ''}`);
					if (!existsSync(ndkbuildExecutable)) {
						return 'Invalid Android NDK path: ndk-build not found';
					}
					return true;
				}
			}
		]);

		if (values.androidSdkPath !== undefined) {
			this.config.set('android.sdkPath', values.androidSdkPath);
		}
		if (values.androidNdkPath !== undefined) {
			this.config.set('android.ndkPath', values.androidNdkPath);
		}
		if (values.androidSdkPath !== undefined || values.androidNdkPath !== undefined) {
			this.config.save();
			this.logger.log('\nConfiguration saved!');
		}
	}

	async iosScreen() {
		if (process.platform !== 'darwin') {
			return;
		}

		this.logger.log(screenTitle('iOS Settings'));

		let data;
		const busy = new BusyIndicator();
		busy.start();

		try {
			({ data } = await detect(this.logger, this.config, this.cli, { all: true }));
		} finally {
			busy.stop();
		}

// 		var devList = [],
// 			devNames = {},
// 			currentDevName = this._config.get('ios.developerName'),
// 			distList = [],
// 			distNames = {},
// 			currentDistName = this._config.get('ios.distributionName');

// 		if (results.detectVersion === '1.0') {
// 			results.certs.devNames.forEach(function (n) {
// 				if (!devNames[n]) {
// 					devList.push({ name: n });
// 					devNames[n] = 1;
// 				}
// 			});

// 			results.certs.distNames.forEach(function (n) {
// 				if (!distNames[n]) {
// 					distList.push({ name: n });
// 					distNames[n] = 1;
// 				}
// 			});
// 		} else {
// 			Object.keys(results.certs.keychains).forEach(function (keychain) {
// 				(results.certs.keychains[keychain].developer || []).forEach(function (dev) {
// 					var n = dev.name;
// 					if ((n === currentDevName || !dev.invalid) && !devNames[n]) {
// 						devList.push(dev);
// 						devNames[n] = 1;
// 					}
// 				});

// 				(results.certs.keychains[keychain].distribution || []).forEach(function (dist) {
// 					var n = dist.name;
// 					if ((n === currentDistName || !dist.invalid) && !distNames[n]) {
// 						distList.push(dist);
// 						distNames[n] = 1;
// 					}
// 				});
// 			});
// 		}

// 		fields.set({
// 			developerName: devList.length && fields.select({
// 				default: currentDevName,
// 				title: __('What do you want to be your default iOS developer cert for device builds?'),
// 				desc: __('(only valid, non-expired developer certs are listed)'),
// 				promptLabel: __('Enter # or cert name'),
// 				display: devList.length > 5 ? 'grid' : 'list',
// 				complete: true,
// 				completeIgnoreCase: true,
// 				zeroSkip: true,
// 				numbered: true,
// 				suggest: true,
// 				optionLabel: 'name',
// 				optionValue: 'name',
// 				formatters: {
// 					option: function (opt, i) {
// 						return '  ' + (i + 1) + ') ' + opt.name.cyan + (opt.expired ? ' ' + __('**EXPIRED**').red : opt.invalid ? ' ' + __('**NOT VALID**').red : '');
// 					}
// 				},
// 				options: devList.sort(function (a, b) {
// 					return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
// 				}),
// 				validate: function (value, callback) {
// 					if (value) {
// 						var i, l;

// 						// try to find an exact match
// 						for (i = 0, l = devList.length; i < l; i++) {
// 							if (devList[i].name === value) {
// 								callback(null, value);
// 								return;
// 							}
// 						}

// 						value += ' (';

// 						// no match, try partial match without the id
// 						for (i = 0, l = devList.length; i < l; i++) {
// 							if (devList[i].name.indexOf(value) === 0) {
// 								callback(null, devList[i].name);
// 								return;
// 							}
// 						}
// 					}

// 					throw new Error(__('Invalid iOS developer certificate'));
// 				}
// 			}),
// 			distributionName: distList.length && fields.select({
// 				default: currentDistName,
// 				title: __('What do you want to be your default iOS distribution cert for App Store and Ad Hoc builds?'),
// 				desc: __('(only valid, non-expired distribution certs are listed)'),
// 				promptLabel: __('Enter # or cert name'),
// 				display: distList.length > 5 ? 'grid' : 'list',
// 				complete: true,
// 				completeIgnoreCase: true,
// 				zeroSkip: true,
// 				numbered: true,
// 				suggest: true,
// 				optionLabel: 'name',
// 				optionValue: 'name',
// 				formatters: {
// 					option: function (opt, i) {
// 						return '  ' + (i + 1) + ') ' + opt.name.cyan + (opt.expired ? ' ' + __('**EXPIRED**').red : opt.invalid ? ' ' + __('**NOT VALID**').red : '');
// 					}
// 				},
// 				options: distList.sort(function (a, b) {
// 					return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
// 				}),
// 				validate: function (value, callback) {
// 					if (value) {
// 						// try to find an exact match
// 						for (var i = 0, l = distList.length; i < l; i++) {
// 							if (distList[i].name === value) {
// 								callback(null, value);
// 								return;
// 							}
// 						}
// 					}

// 					throw new Error(__('Invalid iOS distribution certificate'));
// 				}
// 			})
	}
}

function isDirWritable(dir) {
	dir = expand(dir);
	if (!existsSync(dir)) {
		return;
	}

	const tmpFile = join(dir, `tmp${Math.round(Math.random() * 1e12)}`);
	try {
		if (existsSync(tmpFile)) {
			utimesSync(tmpFile, new Date(), new Date());
		} else {
			writeFileSync(tmpFile, '', 'utf-8');
		}
		if (existsSync(tmpFile)) {
			return dir;
		}
	} finally {
		unlinkSync(tmpFile);
	}
}

function screenTitle(title) {
	const width = 50;
	const margin = width - title.length + 4;
	const pad = Math.floor(margin / 2);

	return `\n${
		gray('┤ '.padStart(pad + 1, '─'))
	}${
		bold(title)
	}${
		gray(' ├'.padEnd(margin - pad + 1, '─'))
	}\n`;
}