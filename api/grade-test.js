import testEngineHandler from './test-engine.js';

async function handler(req, res) {
  req.query = {
    ...(req.query && typeof req.query === 'object' ? req.query : {}),
    action: 'grade'
  };
  return testEngineHandler(req, res);
}

export default handler;
