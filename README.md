# Titanium CLI

> [Titanium CLI](https://github.com/tidev/titanium) is a Command Line Tool for creating and building Titanium Mobile applications and modules. It's open-source and easy to use. [We've](https://github.com/tidev) designed Titanium to be suitable for command line beginners, but still be powerful and extensible enough for production usage.

## Prerequisites

The Titanium CLI requires [Node.js 0.10.x](http://nodejs.org/dist/) or newer.

## Installation

    [sudo] npm install -g titanium

After install, Titanium CLI is executable as `ti`    

## Obtaining a Titanium SDK

You will need to download a Titanium SDK:

    # stable release (recommended)
    ti sdk install --default

## Setting up the Titanium CLI

Before you begin using the Titanium CLI, you should configure it by running the "setup" command:

    ti setup

## Usage

    ti <command> [options]

## Built-in Commands

### config

Configure your CLI settings.

**Implementation not complete**

    ti config <setting> <value>

### help

Displays help or help for a specific command.

    ti

    ti help

    titatinium --help

    ti help <command>

    ti <command> --help

### sdk

Download and install Titanium SDKs

#### sdk install

Installs a specific version of the Titanium SDK. If no version is specified, it assumes the latest.

    ti sdk install

    ti sdk install <version>

    ti sdk install <version> --force

Download, install <version>, and set as default SDK.

    ti sdk install <version> --default

#### sdk uninstall

Uninstalls a Titanium SDK.

    ti sdk uninstall <version>

#### sdk list

Lists all installed Titanium SDKs. Optionally lists all branches and releases.

    ti sdk list

    ti sdk list -r
    ti sdk list --releases

### setup

Reconfigures the Titanium CLI by asking you a series of questions.

    ti setup

### version

Displays the current version of the CLI and exits.

    ti -v

    ti --version

### info

Displays information about your development environment including Xcode installs, iOS SDKs, Android SDKs, and so on.

    ti info

    ti info -o json

## Hacking the Titanium CLI

In order to begin hacking on the Titanium CLI, you need to download and install [git](http://git-scm.com/).

If you have already installed a previous version of the Titanium CLI, it's recommended you uninstall the old one first:

    [sudo] npm uninstall -g titanium

The Titanium CLI is essentially pure JavaScript, so there is no build process.
You just need to pull the code and resolve the dependendencies.

    git clone git@github.com:tidev/titanium.git
    cd titanium
    npm install
    sudo npm link

### Running Unit Tests

To run the unit tests, simply run:

    node forge test

### Running Code Coverage

To generate the code coverage, you first must install [node-jscoverage](https://github.com/visionmedia/node-jscoverage). The easist way to do this is run:

    git clone git@github.com:visionmedia/node-jscoverage.git
    cd node-jscoverage
    ./configure
    make
    sudo make install

Then run:

	node forge test-cov

It will generate a file called _coverage.html_ in the Titanium CLI directory.

## Looking for the really old CLI?

Don't worry, it's still around. You can install it by running:

    [sudo] npm install –g titanium@0.0.26

## License

Titanium is a registered trademark of TiDev Inc. All Titanium trademark and patent rights were transferred and assigned to TiDev Inc. on 04/07/2022. Please see the LEGAL information about using our trademarks, privacy policy, terms of usage and other legal information at http://www.tidev.io/legal.

#### Copyright TiDev, Inc. 04/07/2022-Present
