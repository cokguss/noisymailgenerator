const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  const q = req.query || {};
  const fwd = req.headers["x-forwarded-for"] || "";
  const ip = String(fwd).split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "";
  const out = await engine.opTrack({
    page: q.page,
    ref: q.ref,
    ua: req.headers["user-agent"] || "",
    ip
  });
  res.status(200).json(out);
};

module.exports.maxDuration = 10;
