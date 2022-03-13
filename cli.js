const chalk = require('chalk');
const inquirer = require('inquirer');
const jsonUtils = require("jsonfile");
const csvtojson = require('csvtojson');
const childProcess = require('child_process');
const recursiveReadDir = require('recursive-readdir');

const config = require("./config")

const INTENTION = {
  COMBINE_JSON: 1,
  REGISTER_TIME: 2,
  CANCEL: 3
};

/**
 *
 * @return {*}
 */
function askForIntention() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'intention',
      message: 'What you wanna do?',
      choices: [
        { name: 'Combine JSON from CSV', value: INTENTION.COMBINE_JSON },
        { name: 'Register time in YouTrack', value: INTENTION.REGISTER_TIME },
        { name: 'Cancel', value: INTENTION.CANCEL }
      ]
    }
  ]);
}

/**
 *
 * @return Promise<{ wantsToContinue: boolean }>
 */
function askForContinue () {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'wantsToContinue',
      message: 'Continue?',
      default: false,
    }
  ]);
}

function askForCredentials() {
  return inquirer.prompt([
    {
      type: 'email',
      message: 'Email',
      name: 'email'
    },
    {
      type: 'password',
      message: 'Password',
      name: 'password'
    }
  ]);
}

/**
 *
 * @param email {string}
 * @param password {string}
 */
function runYouTrackAutomaton({ email, password }) {
  return new Promise((resolve) => {
    const subProcess = childProcess.exec(`email=${email} pass=${password} node ./src/automaton.js`);

    subProcess.stdout.setEncoding('utf-8');
    subProcess.stdout.on('data', (data) => {
      console.log(data);
    });
    subProcess.stderr.setEncoding('utf-8');
    subProcess.stderr.on('data', (data) => {
      console.error(data);
    });

    subProcess.on('close', function() {
      console.log(chalk.greenBright('YouTrack Time Register - task completed!'));
      resolve();
    });
  });
}

async function continueCheck() {
  try {
    let answers = await askForContinue();

    return !!answers.wantsToContinue;
  } catch {
    return false;
  }
}

async function app() {

  // check for source.json
  console.log(chalk.cyan('check source.json existence'));
  if (!jsonUtils.readFileSync(config.sourcePath, { throws: false })) {
    jsonUtils.writeFileSync(config.sourcePath, []);
  }
  console.log(chalk.green('check source.json existence - completed'));

  console.log("")

  // check for registry.json
  console.log(chalk.cyan('check registry.json existence'));
  if (!jsonUtils.readFileSync(config.registryFilePath, { throws: false })) {
    jsonUtils.writeFileSync(config.registryFilePath, {});
  }
  console.log(chalk.green('check registry.json existence - completed'));

  console.log("")

  const rootAnswers = await askForIntention();

  if (rootAnswers && rootAnswers.intention) {
    // TODO: try to moce continue check out of rootAnswers if-else conditions
    if (rootAnswers.intention === INTENTION.COMBINE_JSON) {

      await combineCSVtoJSON();
      if (await continueCheck()) {
        app();
      }
      return;

    } else if (rootAnswers.intention === INTENTION.REGISTER_TIME) {

      const answers = await askForCredentials();
      await runYouTrackAutomaton(answers);
      if (await continueCheck()) {
        app();
      }
      return;

    }

    console.log(chalk.green('Good bye!'));
  }
}

app();

// Если выбираю "отметиться в YouTrack"

// Если выбираю "собрать json"
async function combineCSVtoJSON() {
  const files = await recursiveReadDir(config.registryDirPath, ["*.json"]);

  const results = await Promise.all(files.map(async (filePath) => {

    const [fileName] = filePath.split('/').reverse();

    const registry = await jsonUtils.readFile(config.registryFilePath);

    if (registry[fileName]) return [];

    const jsonFromCSV = await csvtojson().fromFile(filePath);

    console.log(`${fileName} - ${chalk.green("OK")}`)

    await jsonUtils.writeFile(config.registryFilePath, {
      ...registry,
      [fileName]: true
    });

    return jsonFromCSV;
  }))

  try {
    let list = results.flat();
    await jsonUtils.writeFile(config.sourcePath, list);
  } catch (e) {
    console.log(e);
  }

  console.log(chalk.greenBright('Task completed!'));
}
