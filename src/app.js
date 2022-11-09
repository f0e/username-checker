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

      const res = await axios.request({
        url: request.url,
        method: request.method,
        data: request.data,
      });

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

      const available = service.is_available(res.data);
      await functions.onWordChecked(service, word, available);

      if (available) {
        process.stdout.write(chalk.green('available!'));
        spacer();
      }

      console.log(res.data);
    }, i * searchData.rateLimit);
  }
}

main();
