const { FakeBrowser } = require("fakebrowser")
const jsonUtils = require("jsonfile");
const dotenv = require("dotenv")
const groupBy = require('lodash.groupby');

const config = require("../config");

dotenv.config();

const USER_DATA = {
  EMAIL: process.env.email ?? "",
  PASSWORD: process.env.pass ?? "",
};

/**
 *
 * @param timeout
 * @return {Promise<void>}
 */
const sleep = (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
})

async function app () {

  // check for env
  if (!process.env.DOMAIN || !process.env.ACTION_TYPES || !process.env.TRIGGET_ACTION_TYPE) {
    throw new Error("Required environment variables are not specified (DOMAIN, ACTION_TYPES, TRIGGER_ACTION_TYPE)")
  }

  const builder = new FakeBrowser.Builder();
  builder.displayUserActionLayer(true);
  builder.vanillaLaunchOptions({
    headless: false
  });
  builder.userDataDir("./userdata")

  let rawSource = await jsonUtils.readFile(config.sourcePath);
  // TODO: может можно обойтись чисто rawSource?
  let rawSourceCache = [...rawSource];

  const sourceIndexes = rawSource.map((item, index) => ({ ...item, index }));


  const source = groupBy(
    sourceIndexes.filter(item => !item.registered),
    "Task"
  );

  console.log({ source });

  const browser = await builder.launch();

  try {

    await sleep(1000);

    // open new page
    const page = await browser.vanillaBrowser.newPage();

    page.on('close', () => {
      browser.shutdown();
      process.exit(0);
    })

    // переходим на страницу трекера
    await page.goto(process.env.DOMAIN);

    await sleep(10000);

    await page.setBypassCSP(true);

    const usernameInput = await page.$("#username");
    const passwordInput = await page.$("#password");
    const submitButton = await page.$('[data-test="login-button"]');

    if (await browser.userAction.simClickElement(usernameInput)) {
      await browser.userAction.simKeyboardType(USER_DATA.EMAIL);
      await browser.userAction.simKeyboardEsc();
    }

    if (await browser.userAction.simClickElement(passwordInput)) {
      await browser.userAction.simKeyboardType(USER_DATA.PASSWORD);
      await browser.userAction.simKeyboardEsc();
    }

    if (await browser.userAction.simClickElement(
      submitButton,
      { pauseAfterMouseUp: false }
    )) {
      await page.waitForNavigation();
    }

    for (let [task, timeFrames] of Object.entries(source)) {
      const taskId = `FORMS-${task}`;

      let targetURL = `https://projects.vesna-soft.ru/issue/${taskId}`;

      console.log(targetURL);

      await page.goto(targetURL);

      await sleep(5000);

      for (let timeFrame of timeFrames) {
        rawSourceCache[timeFrame.index] = {...rawSourceCache[timeFrame.index], registered: true};

        const { date, duration, type } = getTaskDetails(timeFrame);

        await openAddTimeForm(page, browser);

        await sleep(1500);

        await setDate(page, date, browser);
        await setDuration(page, duration, browser);
        await setType(page, type, browser);

        await sleep(3000);

        await submitAddTimeForm(page);
        // await closeAddTimeForm(page, browser);

        await jsonUtils.writeFile(config.sourcePath, rawSourceCache);

        await sleep(1500);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.shutdown();
  }
}

!app();

/**
 *
 * @param page {Page}
 * @return {Promise<void>}
 */
async function openAddTimeForm (page) {
  let el$ = await page.$('[data-test="add-spent-time-action"]');

  await el$.click();
}

/**
 *
 * @param page {Page}
 * @return {Promise<void>}
 */
async function closeAddTimeForm (page) {
  let el$ = await page.$('button[name="cancel"]');

  await el$.click();
}

/**
 *
 * @param page {Page}
 * @return {Promise<void>}
 */
async function submitAddTimeForm (page) {
  let el$ = await page.$('button[name="save"]');

  await el$.click();

  await sleep(2500);
}

/**
 *
 * @param page {Page}
 * @param date
 * @param browser {FakeBrowser}
 * @return {Promise<void>}
 */
async function setDate (page, date, browser) {
  await (await page.$('input[name="date"]')).click();

  await sleep(3000);

  let ringPopupCSSSelector = "div[data-test=\"ring-popup\"]";
  let dayPickerDaySelector = `.DayPicker-Day[aria-label$="${date}"]`;

  const ringPopup$ = await page.$(ringPopupCSSSelector);

  if (ringPopup$) {
    const dayLabel = await page.$(dayPickerDaySelector);

    if (dayLabel) {
      await dayLabel.click();
    }
  }
};

/**
 *
 * @param page {Page}
 * @param duration {string}
 * @param browser {FakeBrowser}
 * @return {Promise<void>}
 */
async function setDuration (page, duration, browser) {
  const el$ = await page.$("input[name=\"duration\"]");

  if (el$) {
    await el$.evaluate((el) => {
      el.value = "";
    })
    await el$.type(duration);
  }
};

/**
 *
 * @param page {Page}
 * @param type {string}
 * @param browser {FakeBrowser}
 * @return {Promise<void>}
 */
async function setType (page, type, browser) {
  let selectionRingCSSSelector = "[data-test=\"ring-select__button\"]";

  const ring$ = await page.$(selectionRingCSSSelector);

  if (ring$) {
    await ring$.click();

    const ringItems$ = await page.$$(`[data-test="ring-popup"] [data-test="ring-list-item-action ring-list-item"] [data-test="ring-list-item-label"]`);

    for (let ringItem$ of ringItems$) {
      const item = await ringItem$.evaluate(item => item.textContent);

      if (item !== type) return;

      await ringItem$.click();
    }
  }
};

async function setDescription () {};



function getTaskDetails ({
  "Duration (h)": durationRaw,
  "Tags": tags ,
  "Start Date": startDate
}) {
  let duration = durationRaw.split(":").map((item, index) => {
    if (index === 0) return `${item}h`;
    if (index === 1) return `${item}m`;
    return null;
  }).join('');

  let {0: day, 2: year} = startDate.split('-');

  let date = `${day} ${year}`;


  let type = null;

  if (tags.includes(process.env.TRIGGET_ACTION_TYPE)) {
    [type] = tags.split(',').map(i => i.trim()).filter(item => {
      return [...process.env.ACTION_TYPES.split(';')].includes(item);
    });
  }

  return {
    date,
    duration,
    type
  };
}
