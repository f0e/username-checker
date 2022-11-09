import axios from 'axios';
import chalk from 'chalk';

import * as functions from './functions.js';

const spacer = () => process.stdout.write(chalk.grey(' | '));

async function main() {
  const service = await functions.selectService();

  const searchData = await functions.getSearchData(service);
  console.log('found', searchData.words.length, 'unchecked words');

  let done = 0;
  for (let i = 0; i < searchData.words.length; i++) {
    setTimeout(async () => {
      const word = searchData.words[i];
      const request = functions.getWordRequestData(service, word);

      let res;
      try {
        res = await axios.request({
          url: request.url,
          method: request.method,
          data: request.data,
        });
      } catch (e) {
        // axios failed, but we still want to use the response (it might be a 404?)
        res = e.response;
      }

      process.stdout.write(
        chalk.grey(`${done + 1}/${searchData.words.length}: `)
      );
      process.stdout.write(word);

      done++;

      if (!res) {
        spacer();
        console.log('failed to send request');
        return;
      }

      spacer();

      let available = false;
      try {
        available = service.is_available(res);
      } catch (e) {
        console.log(e);
      }

      await functions.onWordChecked(service, word, available);

      if (available) console.log(chalk.green('available!'));
      else console.log(chalk.red('taken'));
    }, i * searchData.rateLimit);
  }
}

main();
