// One JSON line per request: easy to read now, easy to search later.
// It logs the PATH only, never the query string, because the OAuth callback URL
// contains a one-time code and a state value that must not end up in logs.
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    if (req.path === "/health") return; // hosting platforms ping this constantly

    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Math.round(Number(process.hrtime.bigint() - start) / 1e6),
        user: req.session?.userId ?? null,
      })
    );
  });

  next();
}