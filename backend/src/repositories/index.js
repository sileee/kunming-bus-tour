const fileRepository = require('./fileRepository');
const mysqlRepository = require('./mysqlRepository');

function getRepository() {
  return process.env.DATA_MODE === 'mysql' ? mysqlRepository : fileRepository;
}

module.exports = {
  getRepository
};
