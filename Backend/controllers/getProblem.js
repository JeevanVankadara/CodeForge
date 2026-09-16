const pool = require('../config/db');
const { parseId, fetchProblem, ProblemError } = require('../services/codeforces');

const db = pool.promise();

const fromRow = (row) => ({
  id: row.id,
  contestId: row.contest_id,
  index: row.idx,
  title: row.title,
  timeLimit: row.time_limit,
  memoryLimit: row.memory_limit,
  legend: row.legend,
  inputSpec: row.input_spec,
  outputSpec: row.output_spec,
  note: row.note,
  samples: typeof row.samples === 'string' ? JSON.parse(row.samples) : row.samples,
  url: row.url,
});

const getProblem = async (req, res) => {
  let meta;
  try {
    meta = parseId(req.params.id);
  } catch (err) {
    return res.status(err.status).json({ error: err.message });
  }

  try {
    const [rows] = await db.query('SELECT * FROM problems WHERE id = ?', [meta.id]);
    if (rows.length) return res.status(200).json(fromRow(rows[0]));

    const problem = await fetchProblem(meta);
    await db.query(
      `INSERT INTO problems
        (id, contest_id, idx, title, time_limit, memory_limit, legend, input_spec, output_spec, note, samples, url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        problem.id, problem.contestId, problem.index, problem.title, problem.timeLimit, problem.memoryLimit,
        problem.legend, problem.inputSpec, problem.outputSpec, problem.note, JSON.stringify(problem.samples), problem.url,
      ]
    );
    return res.status(200).json(problem);
  } catch (err) {
    if (err instanceof ProblemError) return res.status(err.status).json({ error: err.message });
    console.error('getProblem error:', err);
    return res.status(500).json({ error: 'Could not load the problem' });
  }
};

module.exports = getProblem;
