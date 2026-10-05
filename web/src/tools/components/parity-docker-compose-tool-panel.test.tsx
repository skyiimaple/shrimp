import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DockerComposeTool } from './parity-docker-compose-tool-panel';

describe('DockerComposeTool', () => {
  it('converts input and shows errors without stale output', () => {
    render(<DockerComposeTool />);
    fireEvent.change(screen.getByLabelText('Docker run 命令'), {
      target: { value: 'docker run -p 8080:80 nginx' },
    });
    fireEvent.click(screen.getByRole('button', { name: '转换' }));
    expect((screen.getByLabelText('Docker Compose YAML') as HTMLTextAreaElement).value).toContain(
      '8080:80',
    );
    fireEvent.change(screen.getByLabelText('Docker run 命令'), {
      target: { value: 'docker run --privileged nginx' },
    });
    fireEvent.click(screen.getByRole('button', { name: '转换' }));
    expect(screen.getByText(/Unsupported option/)).toBeInTheDocument();
    expect((screen.getByLabelText('Docker Compose YAML') as HTMLTextAreaElement).value).toBe('');
  });
});
