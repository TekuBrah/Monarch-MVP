import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import { createWorker } from 'tesseract.js'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CANDIDATE PREPROCESSING FOR THE GATE 56 SWEEP. HARNESS ONLY — NOT APP CODE.
 *
 * Served by the Vite dev server at `/scripts/ocr-corpus/probe.js` and imported
 * by `sweep.spec.mjs` inside a page, so it runs in the same browser, through the
 * same canvas and the same engine build the app uses. Nothing under `src/`
 * imports it and nothing in the suite collects it.
 *
 * Every candidate is a field on one config object, so a configuration is data
 * and the sweep can vary ONE THING AT A TIME against the control. A field left
 * unset means "do not do this step".
 *
 *   size       { mode: 'shrink', edge }  shrink to `edge` if larger (today's rule)
 *              { mode: 'long', edge }    scale up OR down to `edge`
 *              { mode: 'text', px }      scale so median word height is `px`
 *   maxEdge    ceiling on the long edge after scaling (default 3000)
 *   smoothing  canvas imageSmoothingQuality; unset = the browser default
 *   grey       luminance
 *   stretch    histogram stretch, clipping this fraction at each end
 *   sharpen    unsharp-mask amount over a 3x3 box
 *   blur       3x3 box blur (before thresholding)
 *   binarise   'otsu' | 'sauvola' | 'mean'
 *   window     local window, in multiples of the scaled median word height
 *   k          Sauvola k, or the offset C for 'mean'
 *   psm        tessedit_pageseg_mode, as a string
 *   dpi        user_defined_dpi, as a string
 * ─────────────────────────────────────────────────────────────────────────────
 */

export async function preprocess(file, cfg, measuredWordHeight) {
  const started = performance.now()
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const long = Math.max(bitmap.width, bitmap.height)
    let scale = 1
    const size = cfg.size ?? { mode: 'shrink', edge: 2000 }
    if (size.mode === 'shrink') scale = long > size.edge ? size.edge / long : 1
    else if (size.mode === 'long') scale = size.edge / long
    else if (size.mode === 'text') scale = size.px / measuredWordHeight
    const maxEdge = cfg.maxEdge ?? 3000
    let clamped = false
    if (long * scale > maxEdge) {
      scale = maxEdge / long
      clamped = true
    }
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (cfg.smoothing) ctx.imageSmoothingQuality = cfg.smoothing
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const pixelWork = cfg.grey || cfg.stretch || cfg.sharpen || cfg.blur || cfg.binarise
    if (pixelWork) {
      const img = ctx.getImageData(0, 0, width, height)
      const d = img.data
      const n = width * height
      let g = new Float32Array(n)
      for (let i = 0, p = 0; i < n; i += 1, p += 4) g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]

      if (cfg.stretch) {
        const hist = new Uint32Array(256)
        for (let i = 0; i < n; i += 1) hist[Math.min(255, Math.max(0, Math.round(g[i])))] += 1
        const cut = n * cfg.stretch
        let lo = 0
        for (let acc = 0; lo < 255 && acc + hist[lo] <= cut; lo += 1) acc += hist[lo]
        let hi = 255
        for (let acc = 0; hi > 0 && acc + hist[hi] <= cut; hi -= 1) acc += hist[hi]
        const span = Math.max(1, hi - lo)
        for (let i = 0; i < n; i += 1) g[i] = Math.min(255, Math.max(0, ((g[i] - lo) * 255) / span))
      }

      const box3 = (src) => {
        const out = new Float32Array(n)
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            let s = 0
            let c = 0
            for (let dy = -1; dy <= 1; dy += 1) {
              const yy = y + dy
              if (yy < 0 || yy >= height) continue
              for (let dx = -1; dx <= 1; dx += 1) {
                const xx = x + dx
                if (xx < 0 || xx >= width) continue
                s += src[yy * width + xx]
                c += 1
              }
            }
            out[y * width + x] = s / c
          }
        }
        return out
      }

      if (cfg.sharpen) {
        const b = box3(g)
        for (let i = 0; i < n; i += 1) g[i] = Math.min(255, Math.max(0, g[i] + cfg.sharpen * (g[i] - b[i])))
      }
      if (cfg.blur) g = box3(g)

      if (cfg.binarise === 'otsu') {
        const hist = new Float64Array(256)
        for (let i = 0; i < n; i += 1) hist[Math.round(g[i])] += 1
        let sum = 0
        for (let t = 0; t < 256; t += 1) sum += t * hist[t]
        let sumB = 0
        let wB = 0
        let best = 0
        let threshold = 127
        for (let t = 0; t < 256; t += 1) {
          wB += hist[t]
          if (wB === 0) continue
          const wF = n - wB
          if (wF === 0) break
          sumB += t * hist[t]
          const mB = sumB / wB
          const mF = (sum - sumB) / wF
          const between = wB * wF * (mB - mF) * (mB - mF)
          if (between > best) {
            best = between
            threshold = t
          }
        }
        for (let i = 0; i < n; i += 1) g[i] = g[i] > threshold ? 255 : 0
      } else if (cfg.binarise === 'sauvola' || cfg.binarise === 'mean') {
        const W = width + 1
        const I = new Float64Array(W * (height + 1))
        const I2 = new Float64Array(W * (height + 1))
        for (let y = 0; y < height; y += 1) {
          let row = 0
          let row2 = 0
          for (let x = 0; x < width; x += 1) {
            const v = g[y * width + x]
            row += v
            row2 += v * v
            I[(y + 1) * W + x + 1] = I[y * W + x + 1] + row
            I2[(y + 1) * W + x + 1] = I2[y * W + x + 1] + row2
          }
        }
        const wordPx = measuredWordHeight * scale
        const half = Math.max(7, Math.round((cfg.window ?? 2) * wordPx))
        const k = cfg.k ?? (cfg.binarise === 'sauvola' ? 0.2 : 10)
        const out = new Float32Array(n)
        for (let y = 0; y < height; y += 1) {
          const y0 = Math.max(0, y - half)
          const y1 = Math.min(height, y + half + 1)
          for (let x = 0; x < width; x += 1) {
            const x0 = Math.max(0, x - half)
            const x1 = Math.min(width, x + half + 1)
            const area = (x1 - x0) * (y1 - y0)
            const s = I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0]
            const m = s / area
            let t
            if (cfg.binarise === 'sauvola') {
              const s2 = I2[y1 * W + x1] - I2[y0 * W + x1] - I2[y1 * W + x0] + I2[y0 * W + x0]
              const sd = Math.sqrt(Math.max(0, s2 / area - m * m))
              t = m * (1 + k * (sd / 128 - 1))
            } else t = m - k
            out[y * width + x] = g[y * width + x] > t ? 255 : 0
          }
        }
        g = out
      }

      for (let i = 0, p = 0; i < n; i += 1, p += 4) {
        const v = Math.round(g[i])
        d[p] = v
        d[p + 1] = v
        d[p + 2] = v
        d[p + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return { blob, width, height, scale, clamped, prepMs: Math.round(performance.now() - started) }
  } finally {
    bitmap.close()
  }
}

/** The app's `recognise` engine setup, with the two engine parameters the sweep varies. */
export async function recogniseWith(image, cfg) {
  const worker = await createWorker('eng', 1, {
    workerPath: workerUrl,
    corePath: coreUrl,
    langPath: '/ocr',
    gzip: true,
    logger: () => {},
  })
  try {
    const params = {}
    if (cfg.psm) params.tessedit_pageseg_mode = cfg.psm
    if (cfg.dpi) params.user_defined_dpi = cfg.dpi
    if (Object.keys(params).length) await worker.setParameters(params)
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
    const box = (b) => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 })
    const lines = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          lines.push({
            text: line.text.replace(/\s+$/, ''),
            words: line.words.map((w) => ({ text: w.text, confidence: w.confidence, bbox: box(w.bbox) })),
            bbox: box(line.bbox),
          })
        }
      }
    }
    return { lines, confidence: data.confidence }
  } finally {
    await worker.terminate()
  }
}
