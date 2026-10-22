import app from './app.js';
import { env } from './config.js';

app.listen(env.port, () => {
  console.log('Listening on http://localhost:' + env.port);
});
