import YAML from 'yaml';

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;
  let started = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote !== 'single' && (char === '`' || char === '$'))
      throw new Error('Shell expansion is not supported');
    if (char === '\\' && quote !== 'single') {
      const next = input[++index];
      if (next === undefined) throw new Error('Incomplete shell escape');
      current += next;
      started = true;
    } else if (quote === 'single') {
      if (char === "'") quote = null;
      else current += char;
    } else if (quote === 'double') {
      if (char === '"') quote = null;
      else current += char;
    } else if (char === "'" || char === '"') {
      quote = char === "'" ? 'single' : 'double';
      started = true;
    } else if (/\s/.test(char)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else if (/[;|&<>]/.test(char)) {
      throw new Error('Shell operators are not supported');
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) throw new Error('Unclosed quote');
  if (started) tokens.push(current);
  return tokens;
}

export function dockerRunToCompose(input: string): string {
  const tokens = tokenize(input.trim());
  if (tokens[0] !== 'docker' || tokens[1] !== 'run') {
    throw new Error('Expected a docker run command');
  }
  const service: Record<string, unknown> = {};
  const ports: string[] = [];
  const volumes: string[] = [];
  const envFile: string[] = [];
  const environment: Record<string, string> = {};
  let name = 'app';
  let network: string | undefined;
  let index = 2;
  const valueFor = (flag: string, inline?: string): string => {
    const value = inline ?? tokens[++index];
    if (!value || (inline === undefined && value.startsWith('-'))) {
      throw new Error(`Missing value for ${flag}`);
    }
    return value;
  };
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === '--') {
      index += 1;
      break;
    }
    if (!token.startsWith('-')) break;
    if (token === '-d' || token === '--detach') {
      index += 1;
      continue;
    }
    const match = /^(--[a-z-]+|-p|-e|-v)(?:=(.*))?$/.exec(token);
    if (!match) throw new Error(`Unsupported option: ${token}`);
    const flag = match[1];
    const value = [
      '-p',
      '-e',
      '-v',
      '--name',
      '--restart',
      '--network',
      '--env-file',
      '--publish',
      '--env',
      '--volume',
    ].includes(flag)
      ? valueFor(flag, match[2])
      : undefined;
    switch (flag) {
      case '-p':
      case '--publish':
        ports.push(value!);
        break;
      case '-v':
      case '--volume':
        volumes.push(value!);
        break;
      case '--env-file':
        envFile.push(value!);
        break;
      case '--name':
        name = value!;
        break;
      case '--restart':
        service.restart = value;
        break;
      case '--network':
        if (['host', 'none', 'bridge'].includes(value!) || value!.startsWith('container:')) {
          throw new Error(`Unsupported network mode: ${value}`);
        }
        network = value;
        break;
      case '-e':
      case '--env': {
        const equal = value!.indexOf('=');
        if (equal <= 0) throw new Error(`Environment variable must use KEY=VALUE: ${value}`);
        environment[value!.slice(0, equal)] = value!.slice(equal + 1);
        break;
      }
      default:
        throw new Error(`Unsupported option: ${token}`);
    }
    index += 1;
  }
  const image = tokens[index++];
  if (!image) throw new Error('Missing Docker image');
  service.image = image;
  if (ports.length) service.ports = ports;
  if (volumes.length) service.volumes = volumes;
  if (Object.keys(environment).length) service.environment = environment;
  if (envFile.length) service.env_file = envFile;
  if (network) service.networks = [network];
  if (index < tokens.length) service.command = tokens.slice(index);
  const compose: Record<string, unknown> = { services: { [name]: service } };
  if (network) compose.networks = { [network]: null };
  return YAML.stringify(compose);
}
