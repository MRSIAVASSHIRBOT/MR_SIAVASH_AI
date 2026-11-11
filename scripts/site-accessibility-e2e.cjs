"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const ROUTES = ["index.html", "studio.html", "academy.html", "python.html", "privacy.html"];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2"
};

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const filePath = path.resolve(ROOT, "." + pathname);
      if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await fs.readFile(filePath);
      response.writeHead(200, {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
}

async function auditPage(page, route) {
  const pageErrors = [];
  const onPageError = error => pageErrors.push(error.message);
  page.on("pageerror", onPageError);

  const response = await page.goto("http://127.0.0.1:4174/" + route, { waitUntil: "load", timeout: 20000 });
  if (!response || !response.ok()) throw new Error(route + ": page returned an unsuccessful response");

  const structural = await page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      return !element.hidden && style.display !== "none" && style.visibility !== "hidden" &&
        element.getClientRects().length > 0;
    };
    const textOf = element => String(
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("aria-labelledby")?.split(/\\s+/)
        .map(id => document.getElementById(id)?.textContent || "").join(" ") ||
      element.innerText ||
      element.textContent ||
      ""
    ).replace(/\\s+/g, " ").trim();
    const duplicateIds = [...document.querySelectorAll("[id]")].map(element => element.id)
      .filter((id, index, all) => all.indexOf(id) !== index);
    const controls = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
      .filter(visible)
      .filter(element => {
        const hasExplicitLabel = Boolean(element.getAttribute("aria-label") ||
          element.getAttribute("aria-labelledby"));
        const hasForLabel = element.id && [...document.querySelectorAll("label[for]")]
          .some(label => label.htmlFor === element.id && visible(label));
        return !hasExplicitLabel && !hasForLabel && !element.closest("label");
      });
    const unnamedButtons = [...document.querySelectorAll("button")]
      .filter(visible).filter(element => !textOf(element));
    const unnamedLinks = [...document.querySelectorAll("a[href]")]
      .filter(visible).filter(element => {
        const imageName = [...element.querySelectorAll("img[alt]")]
          .map(image => image.getAttribute("alt")).join(" ").trim();
        return !textOf(element) && !imageName;
      });
    const imagesWithoutAlt = [...document.querySelectorAll("img")]
      .filter(element => !element.hasAttribute("alt"));
    const framesWithoutTitle = [...document.querySelectorAll("iframe")]
      .filter(element => !element.getAttribute("title")?.trim());
    const unsafeBlankLinks = [...document.querySelectorAll('a[target="_blank"]')]
      .filter(element => !element.relList.contains("noopener"));
    const mainLandmarks = [...document.querySelectorAll("main,[role=main]")].filter(visible);
    const visibleH1 = [...document.querySelectorAll("h1")].filter(visible);
    return {
      title: document.title.trim(),
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      mainCount: mainLandmarks.length,
      h1Count: visibleH1.length,
      duplicateIds,
      unlabeledControls: controls.map(element => element.outerHTML.slice(0, 180)),
      unnamedButtons: unnamedButtons.map(element => element.outerHTML.slice(0, 180)),
      unnamedLinks: unnamedLinks.map(element => element.outerHTML.slice(0, 180)),
      imagesWithoutAlt: imagesWithoutAlt.map(element => element.outerHTML.slice(0, 180)),
      framesWithoutTitle: framesWithoutTitle.map(element => element.outerHTML.slice(0, 180)),
      unsafeBlankLinks: unsafeBlankLinks.map(element => element.outerHTML.slice(0, 180)),
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth
    };
  });

  const findings = [];
  if (!structural.title) findings.push("missing document title");
  if (!structural.lang || !structural.dir) findings.push("missing document language or direction");
  if (structural.mainCount !== 1) findings.push("expected exactly one visible main landmark, got " + structural.mainCount);
  if (structural.h1Count !== 1) findings.push("expected exactly one visible h1, got " + structural.h1Count);
  for (const key of ["duplicateIds", "unlabeledControls", "unnamedButtons", "unnamedLinks",
    "imagesWithoutAlt", "framesWithoutTitle", "unsafeBlankLinks"]) {
    if (structural[key].length) findings.push(key + ": " + JSON.stringify(structural[key]));
  }
  if (structural.documentWidth > structural.viewportWidth + 2) {
    findings.push("horizontal overflow at " + structural.viewportWidth + "px (" + structural.documentWidth + "px document)");
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopWidth = await page.evaluate(() => {
    const overflowingElements = [...document.querySelectorAll("body *")]
      .map(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || "",
          className: typeof element.className === "string" ? element.className.slice(0, 90) : "",
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          position: style.position,
          html: element.outerHTML.slice(0, 140)
        };
      })
      .filter(item => item.width > 0 && item.right > window.innerWidth + 2)
      .sort((a, b) => b.right - a.right)
      .slice(0, 8);
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      overflowingElements
    };
  });
  if (desktopWidth.document > desktopWidth.viewport + 2) {
    findings.push("horizontal overflow at desktop width (" + desktopWidth.document + "px document); elements: " +
      JSON.stringify(desktopWidth.overflowingElements));
  }
  if (pageErrors.length) findings.push("uncaught page errors: " + pageErrors.join(" | "));
  page.off("pageerror", onPageError);

  return { route, findings, title: structural.title };
}

async function main() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4174, "127.0.0.1", resolve);
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block"
    });
    page.setDefaultTimeout(10000);

    const results = [];
    for (const route of ROUTES) results.push(await auditPage(page, route));

    const failures = results.filter(result => result.findings.length);
    if (failures.length) {
      for (const result of failures) {
        process.stderr.write("\\n" + result.route + ":\\n - " + result.findings.join("\\n - ") + "\\n");
      }
      throw new Error(failures.length + " route(s) failed accessibility/responsive smoke checks");
    }

    process.stdout.write("Site accessibility smoke: PASS\\n");
    for (const result of results) process.stdout.write(" - " + result.route + ": " + result.title + "\\n");
    process.stdout.write("Checks: language/direction, title, main landmark, visible h1, unique IDs, labelled controls, named links/buttons, image alt, iframe title, safe external links, mobile/desktop overflow, uncaught page errors.\\n");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
