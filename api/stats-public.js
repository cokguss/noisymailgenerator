const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  try {
    res.status(200).json(await engine.opPublicStats());
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports.maxDuration = 10;
