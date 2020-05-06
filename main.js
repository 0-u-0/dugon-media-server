
const Agent = require('./libs/agent');
const Hub = require('./libs/hub');
const Monitor = require('./libs/monitor');


const DEFAULT_CONFIG_PATH = './config';

async function main() {

  let configPath = DEFAULT_CONFIG_PATH;
  if (process.argv.length > 2) {
    console.log(process.argv)
    configPath = [process.cwd(), process.argv[2]].join('/');
  }

  const Config = require(configPath);

  console.log(Config);
  const hub = new Hub(Config.ip, Config.publicIp, Config.port);
  await hub.init();

  if (Config.monitor) {
    //TODO(CC): port
    const monitor = new Monitor(7070, hub);
    monitor.serve();
  }

  const agent = new Agent(hub);
  agent.init(Config.nats, Config.id, Config.name, Config.host, Config.area);

}


main();