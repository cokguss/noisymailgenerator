const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  res.status(200).json(await engine.opStatus());
};

module.exports.maxDuration = 10;
