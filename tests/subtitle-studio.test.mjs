import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SUBTITLE_FILE_BYTES,
  parseSubtitles,
  serializeSrt,
  serializeVtt,
  validateCues
} from "../subtitle-studio-core.mjs";

test("SRT import handles BOM, CRLF, cue indices and Persian text", () => {
  const source = "\uFEFF1\r\n00:00:01,000 --> 00:00:02,500\r\nسلام دنیا\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nخط دوم";
  const cues = parseSubtitles(source, "srt");
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 1);
  assert.equal(cues[0].end, 2.5);
  assert.equal(cues[0].text, "سلام دنیا");
});

test("WebVTT import supports cue identifiers and minute-only timestamps", () => {
  const source = "WEBVTT\n\nintro\n00:01.250 --> 00:03.000 align:start\nWelcome\n";
  const cues = parseSubtitles(source, "vtt");
  assert.equal(cues[0].start, 1.25);
  assert.equal(cues[0].end, 3);
  assert.equal(cues[0].text, "Welcome");
});

test("subtitle exports round-trip through both supported formats", () => {
  const cues = [
    { id: "a", start: 0.125, end: 1.875, text: "یک\nدو" },
    { id: "b", start: 2, end: 4.25, text: "Three" }
  ];
  const srt = serializeSrt(cues);
  const vtt = serializeVtt(cues);
  assert.deepEqual(parseSubtitles(srt, "srt").map(cue => [cue.start, cue.end, cue.text]), cues.map(cue => [cue.start, cue.end, cue.text]));
  assert.deepEqual(parseSubtitles(vtt, "vtt").map(cue => [cue.start, cue.end, cue.text]), cues.map(cue => [cue.start, cue.end, cue.text]));
});

test("malformed, empty and reversed cue intervals fail closed", () => {
  assert.throws(() => parseSubtitles("1\n00:00:02,000 --> 00:00:01,000\nمتن", "srt"), /بعد از زمان شروع/);
  assert.throws(() => parseSubtitles("1\n00:00:01,000 --> 00:00:02,000\n", "srt"), /متن خالی/);
  assert.throws(() => parseSubtitles("WEBVTT\n\n00:61.000 --> 00:62.000\ntext", "vtt"), /خارج از محدوده/);
  assert.throws(() => parseSubtitles("00:00:01,000 --> 00:00:02,000\ntext", "vtt"), /سرآیند WEBVTT/);
});

test("imports are bounded by byte size and cue count", () => {
  assert.throws(() => parseSubtitles("x".repeat(MAX_SUBTITLE_FILE_BYTES + 1), "srt"), /۲ مگابایت/);
  const tooMany = Array.from({ length: 1001 }, (_, index) =>
    String(index + 1) + "\n00:00:01,000 --> 00:00:02,000\ntext"
  ).join("\n\n");
  assert.throws(() => parseSubtitles(tooMany, "srt"), /۱۰۰۰/);
});

test("quality audit reports overlaps, fast reading, long lines and video overflow", () => {
  const report = validateCues([
    { id: "first", start: 0, end: 2, text: "A".repeat(50) },
    { id: "second", start: 1.5, end: 4, text: "B".repeat(80) }
  ], { videoDurationSeconds: 3 });
  const codes = report.warnings.map(issue => issue.code);
  assert.ok(codes.includes("overlap"));
  assert.ok(codes.includes("reading_speed"));
  assert.ok(codes.includes("long_line"));
  assert.ok(codes.includes("beyond_video"));
  assert.equal(report.valid, true);
});

test("empty text and invalid intervals block export", () => {
  const cues = [{ id: "bad", start: 2, end: 1, text: "" }];
  const report = validateCues(cues);
  assert.equal(report.valid, false);
  assert.throws(() => serializeSrt(cues), /خطاهای ساختاری/);
  assert.throws(() => serializeVtt(cues), /خطاهای ساختاری/);
});
