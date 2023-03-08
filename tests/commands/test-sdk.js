/**
 * Titanium CLI
 * Copyright TiDev, Inc. 04/07/2022-Present
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
/* eslint-env mocha */
'use strict';

const SDK = require('../../lib/commands/sdk');
const path = require('path');
// const fs = require('fs-extra');
const config = require('../../lib/config');
require('should'); // eslint-disable-line no-unused-vars

const MockLogger = require('../mocklogger');
const sdksPath = path.join(__dirname, '../resources/sdks');

describe('sdk', () => {

	let logger;
	beforeEach(() => {
		logger = new MockLogger();
	});

	it('title', () => {
		SDK.title.should.eql('SDK');
	});

	it('desc', () => {
		SDK.desc.should.eql('manages installed Titanium SDKs');
	});

	describe('#config()', () => {
		it('is a Function', () => SDK.config.should.be.a.Function());

		it('returns an Object', function () {
			const result = SDK.config(logger, config, null);
			result.should.be.an.Object();
			// TODO: Verify the structure of the object!
		});
	});

	describe('#run()', () => {
		it('is a Function', () => SDK.run.should.be.a.Function());
		/*
		describe('list', () => {
			// TODO: test with json output
			it('with no sdks', function (finished) {
				const cli = {
					argv: {
						_: [],
						$: 'titanium'
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [],
						},
						sdks: []
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (err) {
						return finished(err);
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'log', 'SDK Install Locations:' ]);
					// call 2 is the install location path
					logger.calls[3].should.eql([ 'log', 'No Titanium SDKs are installed\n' ]);
					logger.calls[4].should.eql([ 'log', `You can download the latest Titanium SDK by running: ${('titanium sdk install').cyan}\n` ]);
					finished();
				});
			});

			it('with an sdk', function (finished) {
				const sdkPath = path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA');
				const cli = {
					argv: {
						_: [],
						$: 'titanium'
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [
								sdksPath
							],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: sdkPath
							}
						}
					}
				};
				SDK.run(logger, config, cli, function (err) {
					if (err) {
						return finished(err);
					}
					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'log', 'SDK Install Locations:' ]);
					// call 2 is the install location path
					logger.calls[3].should.eql([ 'log', undefined ]);
					logger.calls[4].should.eql([ 'log', 'Installed SDKs:' ]);
					logger.calls[5].should.eql([ 'log', `   ${('11.1.1.GA').cyan}${' [selected]'.grey}  ${'11.1.1.GA  '.magenta}${sdkPath}` ]);
					logger.calls[6].should.eql([ 'log', undefined ]);
					finished();
				});
			});

			it('--branches', function (finished) {
				this.timeout(30000); // 30 seconds
				this.slow(3000); // slow after 3s
				// FIXME: Why do we we enforce that an sdk must be installed before being able to list releases/branches?
				const sdkPath = path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA');
				const cli = {
					argv: {
						_: [],
						$: 'titanium',
						branches: true
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [
								sdksPath
							],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: sdkPath
							}
						}
					}
				};
				SDK.run(logger, config, cli, function (err) {
					if (err) {
						return finished(err);
					}
					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'log', 'SDK Install Locations:' ]);
					// call 2 is the install location path
					logger.calls[3].should.eql([ 'log', undefined ]);
					logger.calls[4].should.eql([ 'log', 'Installed SDKs:' ]);
					logger.calls[5].should.eql([ 'log', `   ${('11.1.1.GA').cyan}${' [selected]'.grey}  ${'11.1.1.GA  '.magenta}${sdkPath}` ]);
					logger.calls[6].should.eql([ 'log', undefined ]);
					// branch listing header
					logger.calls[7].should.eql([ 'log', 'Branches:' ]);
					// TODO: verify log levels of below...
					// Verify master is default branch and is listed
					logger.buffer.should.containEql(`   ${'master'.cyan}${' [default]'.grey}`);
					// Verify 9_2_X branch exists
					logger.buffer.should.containEql(`   ${'11_1_X'.cyan}`);

					finished();
				});
			});

			it('--branch 11_1_X', function (finished) {
				this.timeout(30000); // 30 seconds
				this.slow(3000); // slow after 3s
				// FIXME: Why do we we enforce that an sdk must be installed before being able to list releases/branches?
				const sdkPath = path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA');
				const cli = {
					argv: {
						_: [],
						$: 'titanium',
						branch: '11_1_X'
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [
								sdksPath
							],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: sdkPath
							}
						}
					}
				};
				SDK.run(logger, config, cli, function (err) {
					if (err) {
						return finished(err);
					}
					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'log', 'SDK Install Locations:' ]);
					// call 2 is the install location path
					logger.calls[3].should.eql([ 'log', undefined ]);
					logger.calls[4].should.eql([ 'log', 'Installed SDKs:' ]);
					logger.calls[5].should.eql([ 'log', `   ${('11.1.1.GA').cyan}${' [selected]'.grey}  ${'11.1.1.GA  '.magenta}${sdkPath}` ]);
					logger.calls[6].should.eql([ 'log', undefined ]);
					// branch listing header
					logger.calls[7].should.eql([ 'log', '\'11_1_X\' Branch Builds:' ]);
					// TODO: verify log levels of below...
					// Verify warning at bottom
					logger.buffer.should.endWith(`${'** NOTE: these builds not recommended for production use **'.grey}\n\n`);

					finished();
				});
			});

			it('--releases', function (finished) {
				// FIXME: Why do we we enforce that an sdk must be installed before being able to list releases/branches?
				this.timeout(30000); // 30 seconds
				this.slow(3000); // slow after 3s
				const sdkPath = path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA');
				const cli = {
					argv: {
						_: [],
						$: 'titanium',
						releases: true
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [
								sdksPath
							],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: sdkPath
							}
						}
					}
				};
				SDK.run(logger, config, cli, function (err) {
					if (err) {
						return finished(err);
					}
					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'log', 'SDK Install Locations:' ]);
					// call 2 is the install location path
					logger.calls[3].should.eql([ 'log', undefined ]);
					logger.calls[4].should.eql([ 'log', 'Installed SDKs:' ]);
					logger.calls[5].should.eql([ 'log', `   ${('11.1.1.GA').cyan}${' [selected]'.grey}  ${'11.1.1.GA  '.magenta}${sdkPath}` ]);
					logger.calls[6].should.eql([ 'log', undefined ]);
					// Release listing header
					logger.calls[7].should.eql([ 'log', 'Releases:' ]);
					// Verify 11.1.1.GA is listed and thinks it is installed
					logger.buffer.should.containEql('10.1.0.GA');

					finished();
				});
			});
		});

		describe('install', () => {
			// TODO: Test with install location in place we don't have rights to create/write
			it('install SDK', function (finished) {
				this.timeout(5 * 60 * 1000); // 5 minutes
				this.slow(3000); // slow after 3s
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: true,
						'progress-bars': false,
						version: '11.1.1.GA'
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (_err) {
					try {
						logger.calls[0].should.eql([ 'banner', undefined ]);
						logger.calls[5].should.eql([ 'log',
							'\nTitanium SDK \x1B[36m11.1.1.GA\x1B[39m successfully installed. Run \'\x1B[36mtitanium sdk select\x1B[39m\' to select your main Titanium SDK.\n' ]);
					} catch (e) {
						return finished(e);
					}
					finished();
				});
			});

			it('with pre-existing local sdk, matching timestamp, without --force', function (finished) {
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: false,
						'progress-bars': false,
						version: path.join(__dirname, '../resources/mobilesdk-11.1.1.GA-osx.zip')
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
									timestamp: '9/23/2020 16:25'
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (_err) {
					try {
						logger.calls[0].should.eql([ 'banner', undefined ]);
						logger.calls[2].should.eql([ 'error', 'Titanium SDK 11.1.1.GA is already installed' ]);
					} catch (e) {
						return finished(e);
					}

					finished();
				});
			});

			it('with pre-existing local sdk, mismatched timestamp, without --force', function (finished) {
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: false,
						'progress-bars': false,
						version: path.join(__dirname, '../resources/mismatched_timestamp.zip')
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
									timestamp: '9/23/2020 16:25'
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (_err) {
					try {
						logger.calls[4].should
							.eql([ 'log', '\nTitanium SDK \x1B[36m9.2.0.GA\x1B[39m successfully installed. Run \'\x1B[36mtitanium sdk select\x1B[39m\' to select your main Titanium SDK.\n' ]);
					} catch (e) {
						return finished(e);
					}

					finished();
				});
			});

			it('with bad sdk zipfile structure', function (finished) {
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: false,
						'progress-bars': false,
						version: path.join(__dirname, '../resources/bad_folders.zip')
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
									timestamp: '9/23/2020 16:25'
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (err) {
					try {
						err.message.should.eql('Zip file does not contain a valid Titanium SDK');
					} catch (e) {
						return finished(e);
					}

					finished();
				});
			});

			it('with sdk zip missing manifest.json', function (finished) {
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: false,
						'progress-bars': false,
						version: path.join(__dirname, '../resources/no_manifest.zip')
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (err) {
					try {
						err.message.should.eql('Zip file does not contain a valid Titanium SDK');
					} catch (e) {
						return finished(e);
					}

					finished();
				});
			});

			it('with invalid branch', function (finished) {
				const cli = {
					argv: {
						_: [ 'install' ],
						$: 'titanium',
						default: false,
						force: false,
						quiet: false,
						'progress-bars': false,
						branch: 'foo'
					},
					env: {
						installPath: sdksPath,
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
									timestamp: '9/23/2020 16:25'
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					},
					addAnalyticsEvent: (_name, _obj) => {}
				};

				SDK.run(logger, config, cli, function (_err) {
					try {
						logger.buffer.should.containEql('Branch "foo" does not exist');
					} catch (e) {
						return finished(e);
					}

					finished();
				});
			});
		});

		describe('uninstall', () => {
			it('errors with no sdk specified', function (finished) {
				const cli = {
					argv: {
						_: [ 'uninstall' ],
						$: 'titanium',
						prompt: false
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [],
						},
						sdks: []
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about no SDK specified'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'error', 'No SDK version specified\n' ]);
					logger.calls[2].should.eql([ 'log', `Usage: ${('titanium sdk uninstall <version>').cyan}\n` ]);
					finished();
				});
			});

			it('errors with invalid/uninstalled sdk specified', function (finished) {
				const cli = {
					argv: {
						_: [ 'uninstall' ],
						$: 'titanium',
						prompt: false,
						version: '9.1.0.GA'
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks:  {
							'11.1.1.GA': {
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about SDK not found'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'error', 'Titanium SDK "9.1.0.GA" is not found\n' ]);
					// it suggests installed sdks
					logger.calls[2].should.eql([ 'log', 'Did you mean this?' ]);
					logger.calls[3].should.eql([ 'log', `    ${'11.1.1.GA'.cyan}` ]);
					finished();
				});
			});

			it('errors when prompting is off but no --force', function (finished) {
				const cli = {
					argv: {
						_: [ 'uninstall' ],
						$: 'titanium',
						prompt: false,
						version: '11.1.1.GA'
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks:  {
							'11.1.1.GA': {
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about no force specified'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'error', `To uninstall a Titanium SDK in non-interactive mode, you must use ${'--force'.cyan}\n` ]);
					logger.calls[2].should.eql([ 'log', `Usage: ${'titanium sdk uninstall 11.1.1.GA --force'.cyan}\n` ]);

					finished();
				});
			});
		});
*/
		describe('select', () => {
			it('errors with no valid sdks installed', function (finished) {
				const cli = {
					argv: {
						_: [ 'select' ],
						$: 'titanium',
						prompt: false
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [],
						},
						sdks: {}
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about no valid SDKs'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'error', 'No suitable Titanium SDKs installed\n' ]);
					finished();
				});
			});

			it('errors with no sdk specified', function (finished) {
				const cli = {
					argv: {
						_: [ 'select' ],
						$: 'titanium',
						prompt: false
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [],
						},
						sdks: {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about no SDK specified'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[1].should.eql([ 'error', 'No SDK version specified\n' ]);
					logger.calls[2].should.eql([ 'log', `Usage: ${('titanium sdk select <version>').cyan}\n` ]);
					finished();
				});
			});

			it('errors with invalid/uninstalled sdk specified', function (finished) {
				const cli = {
					argv: {
						_: [ 'select' ],
						$: 'titanium',
						prompt: false,
						version: '9.1.0.GA'
					},
					env: {
						installPath: '',
						os: {
							name: 'osx',
							sdkPaths: [ sdksPath ],
						},
						sdks:  {
							'11.1.1.GA': {
								manifest: {
									name: '11.1.1.GA',
									version: '11.1.1.GA',
								},
								path: path.join(sdksPath, 'mobilesdk/osx/11.1.1.GA')
							}
						}
					}
				};

				SDK.run(logger, config, cli, function (err) {
					if (!err) {
						return finished(new Error('expected error about SDK not found'));
					}

					logger.calls[0].should.eql([ 'banner', undefined ]);
					logger.calls[2].should.eql([ 'error', 'Invalid Titanium SDK "9.1.0.GA"' ]);
					// logger.calls[3].should.eql([ 'log', 'Did you mean this?' ]);
					// logger.calls[4].should.eql([ 'log', `    ${'11.1.1.GA'.cyan}` ]);
					finished();
				});
			});
		});
	});
});
