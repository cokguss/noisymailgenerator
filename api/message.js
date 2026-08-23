const { createEngine } = require("./_engine");

const engine = createEngine();

module.exports = async (req, res) => {
  try {
    const out = await engine.opMessage({
      email: req.query.email,
      link: req.query.link
    });
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ status: "error", data: null, message: err.message });
  }
};

module.exports.maxDuration = 20;
