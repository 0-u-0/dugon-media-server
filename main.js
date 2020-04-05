
const Agent = require('./libs/agent');
const Hub = require('./libs/hub');

async function main() {
  const hub = new Hub();
  await hub.init();

  const agent = new Agent(hub);
  agent.init();

}


main();