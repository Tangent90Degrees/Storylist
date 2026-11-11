// Pangu spacing — inserts a narrow no-break space between CJK characters
// and adjacent half-width Latin letters or digits. Per ui.md.
// Also applies Chinese punctuation compression.

const CJK = '⺀-⻿⼀-⿟぀-ゟ゠-ヿ' +
    '㄀-ㄯ㈀-㋿㐀-䶿一-鿿' +
    'ꀀ-꒏꒐-꓿가-퟿豈-﫿' +
    '︰-﹏﹐-﹯＀-￯'

const NARROW = ' ' // narrow no-break space (quarter-width)

const reCjkLatin = new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g')
const reLatinCjk = new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g')

export function panguSpacing(text) {
    if (!text) return text
    return text
        .replace(reCjkLatin, `$1${NARROW}$2`)
        .replace(reLatinCjk, `$1${NARROW}$2`)
}

// Chinese punctuation compression — insert U+200B (zero-width space) between
// consecutive fullwidth punctuation pairs so the browser's CJK kern table can
// optionally tighten the gap.
const FULL_PUNCT = '、。，！？；：' +
    '《》〈〉『』「」' +
    '【】〔〕‘’“”'
const rePunctPairs = new RegExp(
    `([${FULL_PUNCT}])([${FULL_PUNCT}])`, 'g')

export function compressCJKPunctuation(text) {
    if (!text) return text
    return text.replace(rePunctPairs, '$1​$2')
}

export function applyPangu(text) {
    return compressCJKPunctuation(panguSpacing(text))
}

// Walk a DOM subtree and apply Pangu spacing + punctuation compression to
// every text node, skipping code/pre blocks.
export function applyPanguToElement(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.parentElement?.closest('code, pre, kbd, samp'))
                return NodeFilter.FILTER_REJECT
            return node.nodeValue.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT
        }
    })
    const nodes = []
    let n
    while ((n = walker.nextNode())) nodes.push(n)
    for (const node of nodes) {
        const out = applyPangu(node.nodeValue)
        if (out !== node.nodeValue) node.nodeValue = out
    }
}
