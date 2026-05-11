const { SyncwordsClient } = require('./syncwords-client');
const client = new SyncwordsClient();
const uname = process.env.email;
const passwd = process.env.password;

const express = require('express');
const app = express();

// Track all connected SSE clients
const sseClients = new Set();

// SSE endpoint — the page subscribes here and waits for a refresh signal
app.get('/sse', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Trigger endpoint — POST /refresh to reload all connected pages
app.post('/refresh', (req, res) => {
  for (const client of sseClients) {
    client.write('event: refresh\ndata: {}\n\n');
  }
  res.json({ refreshed: sseClients.size });
});

// Update endpoint — finds the current in-progress event and pushes its iframe src to all connected pages
app.post('/update', async (req, res) => {
  try {
    await client.login(uname, passwd);
    const current = await client.getCurrentEvents();

    if (current.length === 0) {
      return res.status(404).json({ error: 'No events currently in progress' });
    }

    const event = await client.getEvent(current[0].id);
    const src = `https://live.syncwords.com/c-${event.slug}?bg_color=000000&font_size=80px&font_color=ffffff`;

    for (const c of sseClients) {
      c.write(`event: load\ndata: ${JSON.stringify({ src })}\n\n`);
    }

    res.json({ slug: event.slug, src, pushed: sseClients.size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Show a specific event by ID — fetches its slug and pushes the new iframe src to all connected pages
app.post('/show/:id', async (req, res) => {
  try {
    await client.login(uname, passwd);
    const event = await client.getEvent(req.params.id);
    const src = `https://live.syncwords.com/c-${event.slug}?bg_color=000000&font_size=80px&font_color=ffffff`;

    for (const c of sseClients) {
      c.write(`event: load\ndata: ${JSON.stringify({ src })}\n\n`);
    }

    res.json({ slug: event.slug, src, pushed: sseClients.size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/cap', async (req, res) => {
  try {
    await client.login(uname, passwd);

    const upcoming = await client.getUpcomingEvents();
    console.log('Upcoming events:', upcoming);

    if (upcoming.length === 0) {
      return res.send('<p>No upcoming events found.</p>');
    }

    const event = await client.getEvent(upcoming[0].id);
    const src = `https://live.syncwords.com/c-${event.slug}?bg_color=000000&font_size=80px&font_color=ffffff`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            iframe { display: block; width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${src}"></iframe>
          <script>
            const es = new EventSource('/sse');
            es.addEventListener('refresh', () => location.reload());
            es.addEventListener('load', (e) => {
              document.querySelector('iframe').src = JSON.parse(e.data).src;
            });
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`<p>Error: ${err.message}</p>`);
  }
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));