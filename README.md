Write App
=========

Web App for Distraction-free writing created with ♥ for writers. 

Features
-----

- Markdown support (Press Ctrl+M or ⌘+M) for preview.
- Dark/Light theme switching.
- Fullscreen support.
- Twitter auth for saving the writeups under your username (for later access). You can use Ctrl+S or ⌘+S to save/update your writeup on the server.
- Saving of writeups locally.

Setup
-----

[Node.js](http://nodejs.org/) and [Redis](http://redis.io) are required to use this app.

Install dependencies via `package.json`.

```bash
$ npm install
```

Rename config_sample.js to config.js and fill in your details.

```js
//Add your twitter and github client ids here...
config.github_client_id = "abcd";
config.github_client_secret = "abcd";
config.twitter_client_id = "abcd";
config.twitter_client_secret = "abcd";
```

You'll need MySQL installed with `inkpen` database. Change the MySQL username/password in `server.js`

Shoot the Node server.

```bash
$ node server.js
```

Play in Browser.

```text
http://localhost:8080
```

Credits
-------

- [Kushagra](http://twitter.com/solitarydesigns)
- [Rishabh](http://twitter.com/_rishabhp)
