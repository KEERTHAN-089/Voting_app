// Some hosting front ends (Azure App Service among them) pass the visitor's address
// with its port attached, like "1.2.3.4:56789" or "[2001:db8::1]:56789". The port
// changes with every connection, so without removing it each request would look
// like a new visitor to the rate limits.
const IPV4_WITH_PORT = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
const IPV6_WITH_PORT = /^\[([0-9a-fA-F:.]+)\]:\d+$/;

const stripPort = (address) => {
  if (typeof address !== 'string') return address;
  const match = IPV4_WITH_PORT.exec(address) || IPV6_WITH_PORT.exec(address);
  return match ? match[1] : address;
};

// Express middleware: replaces req.ip with the address minus any port
const normalizeClientAddress = (req, res, next) => {
  const ip = stripPort(req.ip);
  if (ip !== req.ip) {
    Object.defineProperty(req, 'ip', { value: ip, configurable: true });
  }
  next();
};

module.exports = { stripPort, normalizeClientAddress };
