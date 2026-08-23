const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  const out = await engine.opStats(req.query.key);
  res.status(out.status === "error" && out.error_code === "UNAUTHORIZED" ? 401 : 200).json(out);
};

module.exports.maxDuration = 10;
