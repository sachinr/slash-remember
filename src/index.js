require('dotenv').config();

const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const JsonDB = require('node-json-db');

const memoryDB = new JsonDB('memories', true, false);

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const responder = responseUrl =>
  message => axios.post(responseUrl, {
    response_type: 'in_channel',
    text: message,
  }).catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('<h2>The Remember Slash Command app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

app.post('/commands', (req, res) => {
  const { token, text, response_url, team_id } = req.body;
  const respond = responder(response_url);

  let memories = {};

  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    res.send({ response_type: 'in_channel', text: '' });

    try { memories = memoryDB.getData(`/${team_id}`); } catch (error) {
      console.log('Workspace not found');
    }

    const saveMatch = text.match(/(.*?)(\s+is\s+([\s\S]*))$/i);
    if (saveMatch) {
      const key = saveMatch[1].toLowerCase();
      const value = saveMatch[3];
      const currently = memories[key];
      if (currently) {
        respond(`But ${key} is already ${currently}.  Forget ${key} first.`);
      } else {
        const object = {};
        object[key] = value;
        memoryDB.push(`/${team_id}`, object);
        respond(`OK, I'll remember ${key}.`);
      }
    } else {
      const remMatch = text.match(/([^?]+)\??/i);
      if (remMatch) {
        const key = remMatch[1].toLowerCase();
        const value = memories[key];

        const message = value || `Nothing matches ${key}`;
        respond(message);
      }
    }
  } else { res.sendStatus(500); }
});

/*
 * Endpoint to receive interactive message events from Slack.
 * Checks verification token and then update priority.
 */
app.post('/interactive-message', (req, res) => {
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
