const NATO_WORDS = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliett',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
  'Whiskey',
  'X-ray',
  'Yankee',
  'Zulu',
] as const;

const natoToLetter = new Map(
  NATO_WORDS.map((word, index) => [word.toLowerCase(), String.fromCharCode(65 + index)]),
);
const natoPattern = new RegExp(
  `\\b(?:${NATO_WORDS.join('|')})(?:\\s+(?:${NATO_WORDS.join('|')}))*\\b`,
  'gi',
);

export function toNatoAlphabet(input: string): string {
  return input.replace(/[A-Za-z]+/g, (word) =>
    [...word].map((letter) => NATO_WORDS[letter.toUpperCase().charCodeAt(0) - 65]).join(' '),
  );
}

export function fromNatoAlphabet(input: string): string {
  return input.replace(natoPattern, (phrase) =>
    phrase
      .split(/\s+/)
      .map((word) => natoToLetter.get(word.toLowerCase()))
      .join(''),
  );
}

export function decodeOutlookSafeLink(input: string): string {
  let wrapper: URL;
  try {
    const source = input.trim();
    if (/%(?![\da-f]{2})/i.test(source)) throw new Error('invalid encoding');
    wrapper = new URL(source);
  } catch {
    throw new Error('请输入有效的 Outlook SafeLink URL。');
  }
  if (
    wrapper.protocol !== 'https:' ||
    !/^[a-z\d-]+\.safelinks\.protection\.outlook\.com$/i.test(wrapper.hostname) ||
    wrapper.username ||
    wrapper.password ||
    wrapper.searchParams.getAll('url').length !== 1
  )
    throw new Error('请输入包含单个 url 参数的 Outlook SafeLink。');

  const targetText = wrapper.searchParams.get('url') ?? '';
  let target: URL;
  try {
    if (/%(?![\da-f]{2})/i.test(targetText)) throw new Error('invalid encoding');
    target = new URL(targetText);
  } catch {
    throw new Error('SafeLink 中的目标 URL 无效。');
  }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('目标 URL 必须是无凭据的 HTTP 或 HTTPS 链接。');
  }
  return target.href;
}

export type GitCommand = { command: string; description: string };

export const COMMON_GIT_COMMANDS: GitCommand[] = [
  { command: 'git status', description: '查看工作区与暂存区状态' },
  { command: 'git diff', description: '查看尚未暂存的改动' },
  { command: 'git diff --staged', description: '查看已暂存的改动' },
  { command: 'git add <path>', description: '暂存指定文件或目录' },
  { command: 'git commit -m "message"', description: '提交已暂存的改动' },
  { command: 'git log --oneline', description: '简要查看提交历史' },
  { command: 'git branch', description: '列出本地分支' },
  { command: 'git switch <branch>', description: '切换到已有分支' },
  { command: 'git switch -c <branch>', description: '创建并切换分支' },
  { command: 'git fetch', description: '获取远端更新' },
  { command: 'git pull', description: '拉取并整合远端更新' },
  { command: 'git push', description: '推送本地提交' },
];

export function findGitCommands(query: string): GitCommand[] {
  const term = query.trim().toLowerCase();
  return term
    ? COMMON_GIT_COMMANDS.filter((item) =>
        `${item.command} ${item.description}`.toLowerCase().includes(term),
      )
    : COMMON_GIT_COMMANDS;
}

export type CommonEmoji = { emoji: string; name: string; keywords: string };

export const COMMON_EMOJIS: CommonEmoji[] = [
  { emoji: '😀', name: 'smile', keywords: '笑脸 开心 微笑' },
  { emoji: '😂', name: 'joy', keywords: '笑哭 大笑 开心' },
  { emoji: '🥹', name: 'holding back tears', keywords: '感动 泪目' },
  { emoji: '😍', name: 'heart eyes', keywords: '喜欢 爱' },
  { emoji: '❤️', name: 'red heart', keywords: '爱心 红心 喜欢' },
  { emoji: '👍', name: 'thumbs up', keywords: '点赞 赞 好' },
  { emoji: '👏', name: 'clap', keywords: '鼓掌 喝彩' },
  { emoji: '🙏', name: 'thanks', keywords: '感谢 谢谢 祈祷' },
  { emoji: '🎉', name: 'party', keywords: '庆祝 派对' },
  { emoji: '🔥', name: 'fire', keywords: '火 热门' },
  { emoji: '✨', name: 'sparkles', keywords: '闪光 魔法' },
  { emoji: '🚀', name: 'rocket', keywords: '火箭 发射' },
  { emoji: '✅', name: 'check', keywords: '完成 正确 勾选' },
  { emoji: '❌', name: 'cross', keywords: '错误 取消' },
  { emoji: '⚠️', name: 'warning', keywords: '警告 注意' },
  { emoji: '💡', name: 'idea', keywords: '想法 灵感' },
  { emoji: '🐛', name: 'bug', keywords: '虫 漏洞' },
  { emoji: '🐱', name: 'cat', keywords: '猫 动物' },
  { emoji: '🌍', name: 'earth', keywords: '地球 世界' },
  { emoji: '☕', name: 'coffee', keywords: '咖啡 饮料' },
];

export function findCommonEmojis(query: string): CommonEmoji[] {
  const term = query.trim().toLowerCase();
  return term
    ? COMMON_EMOJIS.filter((item) =>
        `${item.emoji} ${item.name} ${item.keywords}`.toLowerCase().includes(term),
      )
    : COMMON_EMOJIS;
}
