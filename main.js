
const Agent = require('./libs/agent');
const Hub = require('./libs/hub');
const Monitor = require('./libs/monitor');

async function main() {
  const hub = new Hub();
  await hub.init();

  const monitor = new Monitor(7070,hub);
  monitor.serve();

  const agent = new Agent(hub);
  agent.init();

}


main();