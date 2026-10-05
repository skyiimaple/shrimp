import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { dockerRunToCompose } from './parity-docker-compose';

describe('docker run to compose', () => {
  it('保留单引号里的美元符号和反引号字面量', () => {
    const result = YAML.parse(dockerRunToCompose("docker run -e 'TOKEN=abc$def`ghi' alpine"));
    expect(result.services.app.environment.TOKEN).toBe('abc$def`ghi');
  });
  it('converts common options and preserves image command', () => {
    const result = YAML.parse(
      dockerRunToCompose(
        "docker run -d --name web -p 8080:80 -e FOO='hello world' -v ./data:/data --restart unless-stopped --network front --env-file .env nginx:alpine sh -c 'echo hi'",
      ),
    );
    expect(result.services.web).toMatchObject({
      image: 'nginx:alpine',
      ports: ['8080:80'],
      environment: { FOO: 'hello world' },
      volumes: ['./data:/data'],
      restart: 'unless-stopped',
      networks: ['front'],
      env_file: ['.env'],
      command: ['sh', '-c', 'echo hi'],
    });
    expect(result.networks).toHaveProperty('front');
  });

  it('rejects unsupported flags and shell syntax', () => {
    expect(() => dockerRunToCompose('docker run --privileged nginx')).toThrow(/Unsupported option/);
    expect(() => dockerRunToCompose('docker run nginx; echo unsafe')).toThrow(/shell/i);
  });

  it('rejects missing image and unclosed quote', () => {
    expect(() => dockerRunToCompose('docker run -p 80:80')).toThrow(/image/i);
    expect(() => dockerRunToCompose("docker run -e FOO='bad nginx")).toThrow(/quote/i);
  });

  it('rejects network modes that cannot be represented as named Compose networks', () => {
    expect(() => dockerRunToCompose('docker run --network host nginx')).toThrow(/network mode/i);
  });
});
