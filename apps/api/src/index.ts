import { createApp } from './app.js';

const port = Number(process.env.PORT || 8787);

createApp().listen(port, () => {
  console.log(`API listening on port ${port}`);
});
