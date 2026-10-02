export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/leads') {
      return new Response(JSON.stringify({ ok: true, msg: 'worker alive', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return env.ASSETS.fetch(request);
  }
};
