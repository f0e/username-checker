/*
  template:
  {
    "name": string, website display name
    "url": query url, can be a function that takes in the current word
    "is_available": function to validate that a username is available

    "min_length": inclusive, defaults to none
    "max_length": inclusive, defaults to none

    "request_method": defaults to get
    "request_data": can contain functions that take in the current word
  }
*/

export default [
  {
    name: 'a website',
    url: 'https://example.com',
    min_length: 2,
    max_length: 10,
    is_available: (msg) => msg.available,

    request_method: 'post',
    request_data: {
      username: (word) => [word],
    },
  },
];
