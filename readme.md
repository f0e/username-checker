# username checker

Check a bunch of usernames on websites automatically. Useful for finding short "OG" usernames.

![screenshot](./assets/screenshot.png)

## requirements

- [Node.js](https://nodejs.org)

## usage

Run the commands:

```
npm install
npm start
```

After running, you can look through all of the available usernames the application finds in the `output/[service]` directory.

## adding sites

Rename `services.example.js` to `services.js` and edit it accordingly to add sites.

## adding wordlists

Add text files to the wordlists directory containing lists of words, each on a separate line. I've provided a sample wordlist: [`names.txt`](./wordlists/names.txt).
