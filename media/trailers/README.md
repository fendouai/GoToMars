# MERIDIAN — Official gameplay trailers / 实机宣传片

[中文版 · 42 秒](meridian-trailer-zh.mp4) | [English · 42 seconds](meridian-trailer-en.mp4)

![Gameplay trailer cover](poster.jpg)

Both editions are 1920 × 1080, 25 fps, H.264/yuv420p MP4 with AAC audio, burned-in localized titles and a selectable subtitle track. Separate [Chinese](meridian-trailer-zh.srt) and [English](meridian-trailer-en.srt) SRT files are included. Download the MP4 if your GitHub client does not show an inline player.

两版均为 1080p、25 fps，包含对应语言的画面字幕和可选字幕轨。音轨是原创合成配乐与发射音效，没有旁白。

## What is shown / 画面范围

The film uses the project's shipping Three.js renderer, default modular rocket and actual flight simulation. It shows engine inspection, assembly/cutaway, the launch site, liftoff, stage separation, upper-stage propulsion and a confirmed Earth orbit. Camera paths are authored for the film and simulation time is compressed; cuts skip portions of the flight. The trailer is a cinematic edit of the current development build, rather than an unedited gameplay recording. No generated concept footage, lunar missions or Mars gameplay are shown.

画面来自本项目实际渲染器和飞行模型，镜头为宣传片编排，飞行加速并作剪辑。片中的地球入轨已实现；没有使用生成式概念镜头，也没有展示尚未实现的月球或火星玩法。

## Reproduce / 重新制作

Requirements: Node.js 22.12+, Python 3, ffmpeg and Chromium/Chrome. On macOS, installed Google Chrome is detected automatically. Elsewhere run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

From the repository root:

```sh
npm ci
npm run dev                 # Leave running in one terminal.
# In another terminal:
npm run trailer:capture     # Deterministic 42-second camera edit, 1,050 actual frames.
npm run trailer:finish      # Original audio, captions, MP4, SRT and cover.
npm run trailer:verify      # Format, full decode, browser playback and seeking.
```

Intermediate files go to `/tmp/meridian-trailer` by default; set `TRAILER_WORKDIR` to use a different absolute directory. `TRAILER_BASE_URL` changes the capture server address. Capture fails on browser console/page errors and writes a diagnostic report. The capture entry has its own scene and does not read or modify player saves. Normal game builds do not include this capture page.

Sources: [camera sequence](../../tools/trailer/stage.js), [localized copy and timings](../../tools/trailer/copy.json), [capture](../../tools/trailer/capture.mjs), [audio and encoding](../../tools/trailer/finish.py). All titles refer to features available in the current build.

## Credits / 许可

Original editing, typography layout and synthesized soundtrack: Go To Mars contributors, MIT. Gameplay imagery includes the third-party textures described in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md); those retain their original licenses. No third-party music, stock video or synthesized voice assets are used.
