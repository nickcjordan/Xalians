#!/usr/bin/env node
// Browser regression check for the rail stretching the first reading block.
// Run against a local dev server: node scripts/design/check-reading-flow.js [base URL]
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const planets = require('../../packages/content/json/planets.json');
const { eras } = require('../../packages/content/json/chronicle.json');
const chapterPlans = require('../../packages/content/json/worldChapters.json');

const base = process.argv[2] || 'http://127.0.0.1:3000';
const launch = process.env.PW_CHROME
    ? { executablePath: process.env.PW_CHROME }
    : process.platform === 'win32' ? { channel: 'msedge' } : {};

(async () => {
    const browser = await chromium.launch({ ...launch, headless: true });
    try {
        for (const width of [390, 1024, 1440]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const routes = [
                ...planets.map((planet) => ({
                    path: `/encyclopedia/worlds/${planet.name.toLowerCase()}`,
                    paragraphs: planet.history,
                    chapterCount: chapterPlans.worlds[planet.name.toLowerCase()].chapters.length,
                })),
                ...eras.map((era) => ({ path: `/encyclopedia/story/${era.key}` })),
            ];
            for (const route of routes) {
                await page.goto(base + route.path, { waitUntil: 'networkidle' });
                await page.evaluate(() => document.fonts.ready);
                const metrics = await page.evaluate(() => {
                    const body = document.querySelector('[data-slot="reading-body"]');
                    const blocks = [...body.querySelectorAll('[data-slot="reading-block"]')];
                    return {
                        overflow: document.documentElement.scrollWidth > innerWidth,
                        gaps: blocks.slice(1).flatMap((block, i) =>
                            block.closest('[data-history-chapter]') === blocks[i].closest('[data-history-chapter]')
                                ? [block.getBoundingClientRect().top - blocks[i].getBoundingClientRect().bottom] : []),
                        firstTextGap: (() => {
                            const first = document.getElementById('chapter-0');
                            const second = document.getElementById('chapter-1');
                            return first && second
                                ? second.getBoundingClientRect().top - first.getBoundingClientRect().bottom
                                : null;
                        })(),
                        paragraphs: [...body.querySelectorAll('[data-chapter-index] p.measure')]
                            .map((p) => p.textContent),
                        chapterCount: body.querySelectorAll('[data-history-chapter]').length,
                    };
                });
                const label = `${width}px ${route.path}`;
                assert.equal(metrics.overflow, false, `${label}: horizontal overflow`);
                assert(metrics.gaps.every((gap) => gap >= -1 && gap <= 32), `${label}: stretched or overlapping blocks ${metrics.gaps}`);
                if (route.paragraphs) {
                    assert.deepEqual(metrics.paragraphs, route.paragraphs, `${label}: missing or reordered prose`);
                    assert.equal(metrics.chapterCount, route.chapterCount, `${label}: incorrect chapter grouping`);
                    assert(metrics.firstTextGap >= 0 && metrics.firstTextGap <= 40, `${label}: rail stretched first chapter by ${metrics.firstTextGap}px`);
                }
            }

            await page.goto(`${base}/encyclopedia/worlds/poseidas#chapter-0`, { waitUntil: 'networkidle' });
            if (width < 1000) await page.getByRole('button', { name: /Chapters \(5\)/ }).click();
            await page.locator('[data-slot="reading-rail"] a[href="#section-the-algael-boom"]:visible').click();
            await page.waitForFunction(() => {
                const top = document.getElementById('section-the-algael-boom').getBoundingClientRect().top;
                return top >= 0 && top < 160;
            });
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('enc.read.v1') || '{}')['chapter:poseidas:5']);
            await page.waitForFunction(() => document.querySelector('[data-slot="reading-rail"] a[aria-current="location"]').getAttribute('href') === '#section-the-algael-boom');
            await page.goto(`${base}/encyclopedia/worlds/poseidas#chapter-5`, { waitUntil: 'networkidle' });
            assert(await page.locator('#chapter-5').isVisible(), 'Legacy passage bookmark must remain available');
            assert.deepEqual(errors, [], `${width}px: browser errors`);
            console.log(`${width}px: all 14 worlds and 7 story parts flow correctly; chapter links and read marks work.`);
            await page.close();
        }
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
