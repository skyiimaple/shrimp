import { useEffect, useRef, useState } from 'react';
import { Button, Card, ErrorBox } from '../../components/ui';

const MAX_RECORDING_MS = 30_000;

function cameraError(reason: unknown) {
  if (reason instanceof DOMException && reason.name === 'NotAllowedError')
    return '摄像头或麦克风权限被拒绝，请在浏览器设置中允许后重试。';
  return reason instanceof Error ? reason.message : '无法开启摄像头，请检查设备后重试。';
}

export function CameraRecorderTool() {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const photoUrlRef = useRef('');
  const videoUrlRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const replaceUrl = (kind: 'photo' | 'video', next: string) => {
    const ref = kind === 'photo' ? photoUrlRef : videoUrlRef;
    if (ref.current) URL.revokeObjectURL(ref.current);
    ref.current = next;
    if (kind === 'photo') setPhotoUrl(next);
    else setVideoUrl(next);
  };

  const release = (updateState: boolean) => {
    generationRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    photoUrlRef.current = '';
    videoUrlRef.current = '';
    if (updateState) {
      setActive(false);
      setPending(false);
      setRecording(false);
      setPhotoUrl('');
      setVideoUrl('');
      setError('');
    }
  };

  useEffect(() => () => release(false), []);

  useEffect(() => {
    if (active && liveVideoRef.current) liveVideoRef.current.srcObject = streamRef.current;
  }, [active]);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头，或页面未处于安全连接。');
      return;
    }
    const generation = ++generationRef.current;
    setPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setActive(true);
    } catch (reason) {
      if (generation === generationRef.current) setError(cameraError(reason));
    } finally {
      if (generation === generationRef.current) setPending(false);
    }
  };

  const capture = () => {
    const video = liveVideoRef.current;
    if (!video || !streamRef.current || !video.videoWidth || !video.videoHeight) {
      setError('摄像头画面尚未就绪，请稍后重试。');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context || !canvas.toBlob) {
      setError('当前浏览器无法拍照。');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const generation = generationRef.current;
    canvas.toBlob((blob) => {
      if (generation !== generationRef.current) return;
      if (!blob) {
        setError('照片生成失败，请重试。');
        return;
      }
      replaceUrl('photo', URL.createObjectURL(blob));
      setError('');
    }, 'image/png');
  };

  const stopRecording = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current || typeof MediaRecorder === 'undefined') {
      setError('当前浏览器不支持录像。');
      return;
    }
    try {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(streamRef.current);
      recorderRef.current = recorder;
      const generation = generationRef.current;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (generation !== generationRef.current) return;
        recorderRef.current = null;
        setRecording(false);
        if (chunks.length) {
          replaceUrl(
            'video',
            URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'video/webm' })),
          );
        } else setError('录像为空，请重试。');
      };
      recorder.start();
      setRecording(true);
      setError('');
      timerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (reason) {
      recorderRef.current = null;
      setError(reason instanceof Error ? reason.message : '无法开始录像。');
    }
  };

  return (
    <div className="tool-grid">
      <Card className="grid content-start gap-4">
        <p className="text-muted-foreground text-sm">
          拍照和录像仅在当前浏览器中处理。录像最长 30 秒。
        </p>
        {active ? (
          <>
            <video
              aria-label="摄像头实时预览"
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg bg-black"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={capture}>拍照</Button>
              {recording ? (
                <Button onClick={stopRecording}>停止录制</Button>
              ) : (
                <Button onClick={startRecording}>开始录制</Button>
              )}
              <Button variant="outline" onClick={() => release(true)}>
                关闭摄像头
              </Button>
            </div>
          </>
        ) : (
          <Button disabled={pending} onClick={start}>
            {pending ? '正在开启…' : '开启摄像头'}
          </Button>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>
      <Card className="grid content-start gap-4">
        {photoUrl && (
          <>
            <img alt="照片预览" src={photoUrl} className="max-h-64 max-w-full rounded-lg" />
            <Button asChild variant="outline" className="w-fit">
              <a href={photoUrl} download="camera-photo.png">
                下载照片
              </a>
            </Button>
          </>
        )}
        {videoUrl && (
          <>
            <video
              aria-label="录像预览"
              src={videoUrl}
              controls
              className="max-h-64 w-full rounded-lg"
            />
            <Button asChild variant="outline" className="w-fit">
              <a href={videoUrl} download="camera-video.webm">
                下载录像
              </a>
            </Button>
          </>
        )}
        {!photoUrl && !videoUrl && (
          <p className="text-muted-foreground text-sm">拍摄后可在这里预览和下载。</p>
        )}
      </Card>
    </div>
  );
}
