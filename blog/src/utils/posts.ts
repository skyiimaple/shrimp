import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { parse } from 'yaml'
import hljs from 'highlight.js/lib/common'
export interface BlogPost {
  slug: string
  title: string
  date: string
  category: string
  tags: string[]
  summary: string
  body: string
}
export function parsePost(slug: string, source: string): BlogPost {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source)
  if (!match) throw new Error(`文章 ${slug} 缺少元数据`)
  const data = parse(match[1]) as Record<string, unknown>
  for (const field of ['title', 'date', 'category', 'summary']) {
    if (typeof data?.[field] !== 'string' || !(data[field] as string).trim())
      throw new Error(`文章 ${slug} 的 ${field} 无效`)
  }
  const date = data.date as string
  const normalized = date.length === 10 ? `${date} 00:00:00` : date
  const instant = Date.parse(`${normalized.replace(' ', 'T')}Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(date) ||
    !Number.isFinite(instant) ||
    new Date(instant).toISOString().slice(0, 19).replace('T', ' ') !== normalized
  )
    throw new Error(`文章 ${slug} 的日期无效`)
  if (!Array.isArray(data.tags) || !data.tags.every((tag) => typeof tag === 'string'))
    throw new Error(`文章 ${slug} 的标签无效`)
  return {
    slug,
    title: data.title as string,
    date: normalized,
    category: data.category as string,
    summary: data.summary as string,
    tags: data.tags as string[],
    body: match[2],
  }
}
export function filterPosts(posts: BlogPost[], query: string, category: string, tag: string) {
  const needle = query.trim().toLocaleLowerCase()
  return posts.filter(
    (post) =>
      (category === '全部' || post.category === category) &&
      (tag === '全部' || post.tags.includes(tag)) &&
      [post.title, post.summary, post.body, ...post.tags]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle),
  )
}
export function renderPost(body: string) {
  const headings: { id: string; text: string; level: number }[] = []
  const markdown = new Marked()
  markdown.use({
    renderer: {
      heading({ tokens, depth }) {
        const id = `section-${headings.length + 1}`
        const text = this.parser.parseInline(tokens)
        headings.push({ id, text: DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }), level: depth })
        return `<h${depth} id="${id}">${text}</h${depth}>`
      },
      code({ text, lang }) {
        const language = lang?.split(/\s/)[0]
        const highlighted =
          language && hljs.getLanguage(language)
            ? hljs.highlight(text, { language }).value
            : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<pre><code class="hljs">${highlighted}</code></pre>`
      },
    },
  })
  const sanitized = DOMPurify.sanitize(markdown.parse(body, { async: false }), {
    USE_PROFILES: { html: true },
  })
  const document = new DOMParser().parseFromString(sanitized, 'text/html')
  for (const image of document.querySelectorAll('img[src]')) {
    const source = image.getAttribute('src')!
    if (source.startsWith('/') && !source.startsWith('//')) {
      image.setAttribute('src', `${import.meta.env.BASE_URL}${source.slice(1)}`)
    }
  }
  return {
    headings,
    html: document.body.innerHTML,
  }
}
const sources = import.meta.glob('../content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
export const posts = Object.entries(sources)
  .map(([path, source]) => parsePost(path.split('/').pop()!.replace(/\.md$/, ''), source))
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
