import axios from 'axios';
import chalk from 'chalk';

import * as functions from './functions.js';

async function main() {
  const service = await functions.selectService();

  const searchData = await functions.getSearchData(service);
  console.log('found', searchData.words.length, 'unchecked words');

  let done = 0;
  for (let i = 0; i < searchData.words.length; i++) {
    setTimeout(async () => {
      const word = searchData.words[i];
      const request = functions.getWordRequestData(service, word);

      let out = chalk.grey(`${done + 1}/${searchData.words.length}: `) + word;
      const spacer = () => (out += chalk.grey(' | '));

      const check = async () => {
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

        if (!res) {
          spacer();
          return;
        }

        spacer();

        let available = false;
        try {
          available = service.is_available(res);
        } catch (e) {
          out += chalk.red(e);
          return;
        }

        await functions.onWordChecked(service, word, available);

        if (available) out += chalk.green('available!');
        else out += chalk.red('taken');
      };

      await check();
      console.log(out);

      done++;

      if (done >= searchData.words.length) {
        console.log('done.');
      }
    }, i * searchData.rateLimit);
  }
}

main();
