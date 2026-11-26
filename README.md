# 逻辑填空 · 词条检索（静态版）

在线使用：**https://shepherd27.github.io/kaogong-word-site/**

纯静态页面，不需要服务器：题库数据在本地浏览器里检索，答过的词库存在 localStorage，Markdown 报告直接下载。

## 功能

- 单词 / 词群检索（逗号分隔，如：遏制,遏止,抑制）
- 命中题数、正确项 / 干扰项 / 题干 / 解析分布
- 左右搭配、主题领域、语体、情感语境、考法分布
- 近义词差异对照、反例与「输给谁」、正确语境回填
- 我的词库（本地保存）、导出 Markdown

## 数据

- 言语理解去重后 **12,303 题**
- `data/words.json.gz` 约 6MB（解压后 17MB），首次加载后存入 IndexedDB，之后秒开
- 数据优先走 jsDelivr CDN，失败自动回退到 GitHub Pages

题库内容仅供个人学习使用，请勿公开传播。

## 更新

替换 `data/words.json.gz` 和 `data/version.json` 后推送到 `main`，Pages 约 1 分钟生效。
