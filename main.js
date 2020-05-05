
const Agent = require('./libs/agent');
const Hub = require('./libs/hub');
const Monitor = require('./libs/monitor');

const Config = require('./config');

async function main() {
  console.log(Config);
  const hub = new Hub(Config.ip, Config.publicIp, Config.port);
  await hub.init();

  const monitor = new Monitor(7070, hub);
  monitor.serve();

  const agent = new Agent(hub);
  agent.init(Config.nats, Config.id, Config.name, Config.host, Config.area);

}


main();