const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  try {
    const out = await engine.opGenerate({ network: req.query.network });
    res.status(out.status === "error" ? 502 : 200).json(out);
  } catch (err) {
    res.status(500).json({ status: "error", data: null, message: err.message });
  }
};

module.exports.maxDuration = 30;
