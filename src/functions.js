import fs from 'fs-extra';
import path, { resolve } from 'path';
import readline from 'readline';
import chalk from 'chalk';

import services from '../services.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const OUTPUT_FOLDER = path.join(__dirname, '../output');
const WORDLISTS_FOLDER = path.join(__dirname, '../wordlists');
fs.ensureDir(WORDLISTS_FOLDER);

const rl = readline.createInterface({
  input: process.stdin,
});

const readlineWrap = (question = '> ') => {
  process.stdout.write(question);
  return new Promise((resolve) => rl.question('', resolve));
};

function mapAsync(array, callbackfn) {
  return Promise.all(array.map(callbackfn));
}

async function filterAsync(array, callbackfn) {
  const filterMap = await mapAsync(array, callbackfn);
  return array.filter((value, index) => filterMap[index]);
}

async function getCheckedWords(service) {
  const dir = path.join(OUTPUT_FOLDER, service.name);
  if (!fs.existsSync(dir)) return [];

  const checkedFile = path.join(dir, 'checked.txt');
  if (!fs.existsSync(checkedFile)) return [];

  return (await fs.readFile(checkedFile))
    .toString()
    .split('\n')
    .filter((line) => line.trim());
}

async function getUncheckedWordsInWordlist(
  checked,
  wordlist,
  minlength = null,
  maxlength = null
) {
  const wordlistPath = path.join(WORDLISTS_FOLDER, wordlist);
  let words = (await fs.readFile(wordlistPath)).toString().split('\n');

  // clean up words
  words = words.map((word) => (word = word.trim().toLowerCase()));

  return await filterAsync(words, async (word) => {
    // check length
    if (
      (minlength && word.length < minlength) ||
      (maxlength && word.length > maxlength)
    )
      return false;

    return !checked.includes(word);
  });
}

async function getWordlists(service, checkedWords, maxWordLength = null) {
  // get wordlists
  const wordlistNames = fs.readdirSync(WORDLISTS_FOLDER).filter((file) => {
    return path.extname(file).toLowerCase() == '.txt';
  });

  // get amount of words left in each wordlist
  return await Promise.all(
    wordlistNames.map(async (wordlistName) => ({
      name: wordlistName,
      uncheckedWords: await getUncheckedWordsInWordlist(
        checkedWords,
        wordlistName,
        service.min_length,
        maxWordLength || service.max_length
      ),
    }))
  );
}

export async function selectService() {
  for (const [i, service] of services.entries()) {
    console.log(chalk.bgBlackBright(i + 1) + ' ' + service.name);
  }

  console.log('service?');

  let service;
  while (true) {
    const answer = await readlineWrap();

    const selection = parseInt(answer);
    if (!selection || selection <= 0 || selection > services.length) {
      console.log('input is not a valid service');
      continue;
    }

    service = services[selection - 1];
    break;
  }

  console.log();

  return service;
}

export async function getSearchData(service) {
  const checkedWords = await getCheckedWords(service);

  // get max name length
  console.log(`max name length? (>=${service.min_length} or empty)`);

  let maxWordLength = null;
  while (true) {
    const answer = await readlineWrap();

    const newLength = parseInt(answer);
    if (!newLength) break;

    if (newLength < service.min_length) {
      console.log(
        `enter a number greater than or equal to the minimum name length (${service.min_length})`
      );
      continue;
    }

    maxWordLength = newLength;

    break;
  }

  console.log();

  const wordlists = await getWordlists(service, checkedWords, maxWordLength);
  if (wordlists.length == 0) {
    console.log('no wordlists found, exiting');
    process.exit();
  }

  for (const [i, wordlist] of wordlists.entries()) {
    console.log(
      chalk.bgBlackBright(i + 1) +
        ' ' +
        wordlist.name +
        ' ' +
        chalk.grey(`${wordlist.uncheckedWords.length} remaining`)
    );
  }

  // get wordlist
  console.log('wordlist?');

  let wordlist;
  while (true) {
    const answer = await readlineWrap();

    const selection = parseInt(answer);
    if (!selection || selection <= 0 || selection > wordlists.length) {
      console.log('input is not a valid wordlist');
      continue;
    }

    wordlist = wordlists[selection - 1];
    break;
  }

  console.log();

  // get rate limit
  console.log(`query interval ms? (recommended >15)`);

  let rateLimit;
  while (true) {
    const answer = await readlineWrap();

    rateLimit = parseInt(answer);
    if (!rateLimit) {
      console.log('input is not a valid number');
      continue;
    }

    if (rateLimit < 0) {
      console.log(`enter a positive number`);
      continue;
    }

    break;
  }

  console.log();

  return {
    words: wordlist.uncheckedWords,
    maxWordLength,
    rateLimit,
  };
}

export async function onWordChecked(service, word, available) {
  const dir = path.join(OUTPUT_FOLDER, service.name);
  await fs.ensureDir(dir);

  // write checked
  const checkedFile = path.join(dir, 'checked.txt');
  await fs.ensureFile(checkedFile);

  await fs.appendFile(checkedFile, word + '\n');

  // write available
  if (available) {
    const availableFile = path.join(dir, 'available.txt');
    await fs.ensureFile(availableFile);

    await fs.appendFile(availableFile, word + '\n');
  }
}

export function getWordRequestData(service, word) {
  // evaluate url function
  let url = service.url;
  if (typeof url == 'function') url = url(word);

  // recursively go through a request_data object evaluating any functions
  const fixRequestData = (cur) => {
    for (let [key, value] of Object.entries(cur)) {
      // evaluate functions
      if (typeof value == 'function') cur[key] = value(word);

      // check for nested
      if (typeof value == 'object' && !Array.isArray(value) && value != null) {
        cur[key] = fixRequestData(value);
      }
    }
  };

  let data = null;
  if (service.request_data) {
    data = Object.assign({}, service.request_data);
    fixRequestData(data);
  }

  // set default method
  const method = service.request_method
    ? service.request_method.toLowerCase()
    : 'get';

  return {
    url,
    method,
    data,
  };
}
