import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraRecorderTool } from './parity-camera-tool-panel';

const stopVideo = vi.fn();
const stopAudio = vi.fn();
const stream = {
  getTracks: () => [{ stop: stopVideo }, { stop: stopAudio }],
  getVideoTracks: () => [{ stop: stopVideo }],
} as unknown as MediaStream;
const getUserMedia = vi.fn<() => Promise<MediaStream>>();
const createObjectURL = vi.fn(() => `blob:camera-${createObjectURL.mock.calls.length}`);
const revokeObjectURL = vi.fn();

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state: RecordingState = 'inactive';
  mimeType = 'video/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['clip'], { type: 'video/webm' }) } as BlobEvent);
    this.onstop?.();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia.mockResolvedValue(stream);
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ drawImage: vi.fn() }),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: (callback: BlobCallback) => callback(new Blob(['photo'], { type: 'image/png' })),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CameraRecorderTool', () => {
  it('asks for camera and microphone only after the user starts it', async () => {
    const user = userEvent.setup();
    render(<CameraRecorderTool />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '开启摄像头' }));
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    expect(screen.getByLabelText('摄像头实时预览')).toBeInTheDocument();
  });

  it('shows a permission failure and remains ready to retry', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));
    await userEvent
      .setup()
      .click(render(<CameraRecorderTool />).getByRole('button', { name: '开启摄像头' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('摄像头或麦克风权限被拒绝');
    expect(screen.getByRole('button', { name: '开启摄像头' })).toBeEnabled();
  });

  it('captures a photo and releases its URL and tracks when stopped', async () => {
    const user = userEvent.setup();
    render(<CameraRecorderTool />);
    await user.click(screen.getByRole('button', { name: '开启摄像头' }));
    const preview = screen.getByLabelText('摄像头实时预览') as HTMLVideoElement;
    Object.defineProperty(preview, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(preview, 'videoHeight', { configurable: true, value: 480 });
    await user.click(screen.getByRole('button', { name: '拍照' }));
    expect(screen.getByAltText('照片预览')).toHaveAttribute('src', 'blob:camera-1');
    expect(screen.getByRole('link', { name: '下载照片' })).toHaveAttribute(
      'download',
      'camera-photo.png',
    );
    await user.click(screen.getByRole('button', { name: '关闭摄像头' }));
    expect(stopVideo).toHaveBeenCalledOnce();
    expect(stopAudio).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:camera-1');
    expect(screen.queryByRole('link', { name: '下载照片' })).not.toBeInTheDocument();
  });

  it('records a video for preview and download, then cleans up on unmount', async () => {
    const user = userEvent.setup();
    const view = render(<CameraRecorderTool />);
    await user.click(screen.getByRole('button', { name: '开启摄像头' }));
    await user.click(screen.getByRole('button', { name: '开始录制' }));
    await user.click(screen.getByRole('button', { name: '停止录制' }));
    expect(screen.getByLabelText('录像预览')).toHaveAttribute('src', 'blob:camera-1');
    expect(screen.getByRole('link', { name: '下载录像' })).toHaveAttribute(
      'download',
      'camera-video.webm',
    );
    view.unmount();
    expect(stopVideo).toHaveBeenCalledOnce();
    expect(stopAudio).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:camera-1');
  });

  it('reports unsupported browser APIs without requesting permission', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    render(<CameraRecorderTool />);
    fireEvent.click(screen.getByRole('button', { name: '开启摄像头' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('当前浏览器不支持摄像头'),
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('releases a stream returned after the panel unmounts', async () => {
    let resolveStream!: (value: MediaStream) => void;
    getUserMedia.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStream = resolve;
      }),
    );
    const view = render(<CameraRecorderTool />);
    fireEvent.click(screen.getByRole('button', { name: '开启摄像头' }));
    view.unmount();
    await act(async () => {
      resolveStream(stream);
    });
    expect(stopVideo).toHaveBeenCalledOnce();
    expect(stopAudio).toHaveBeenCalledOnce();
  });

  it('automatically ends a short recording after 30 seconds', async () => {
    const view = render(<CameraRecorderTool />);
    fireEvent.click(screen.getByRole('button', { name: '开启摄像头' }));
    await screen.findByRole('button', { name: '开始录制' });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: '开始录制' }));
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.getByRole('link', { name: '下载录像' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '开始录制' })).toBeInTheDocument();
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
