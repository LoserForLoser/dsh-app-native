# 发布清单 — 把 dsh-app-native 发布到插件市场

**当前状态**：包已全部就绪并通过本地端到端验证。**唯一缺的是账号凭据** —— 本机 npm 未登录（`npm whoami` 报 `ENEEDAUTH`）、未安装 `gh`，所以下面第 1–3 步需要用你自己的账号执行。第 0 步我已经替你做完了。

---

## 0. 已经验证过的（不需要你重复）

| 项目 | 结果 |
|---|---|
| npm 包名可用性 | `dsh-app-native` 未被占用（registry 返回 404） |
| `npm pack` 内容 | 8 个文件 / 13.5 kB：`package.json`、`cordis.patch.yml`、`lib/index.js`、`preset/app-native/{agent.cordis.yml,preset.yml}`、两个 README、LICENSE |
| 安装器行为 | 全新安装 ✓、幂等（本地改动保留）✓、部分拷贝可恢复 ✓、不可写目录只告警不抛错 ✓ —— 共 11 项全通过 |
| 端到端 | 临时 profile 装上 tarball 后**真实启动**，预设自动落盘到 `$DSH_HOME/.agent-presets/app-native/`，与包内内容逐字节一致 ✓ |
| 预设挂载校验 | `agentPresets.standingKeyFor()` = OK（等同一次会话启动的真实组装） |

---

## 1. 建 GitHub 仓库并推送

先在 GitHub 上建一个空仓库 `dsh-app-native`，然后：

```sh
cd /Users/songzhaoyang/Desktop/JLXY/dsh-app-native

# 先补上 npm 元数据里的仓库地址（当前刻意留空，避免出现假 URL）：
#   "repository": { "type": "git", "url": "git+https://github.com/<你>/dsh-app-native.git" }
#   "homepage":   "https://github.com/<你>/dsh-app-native#readme"
#   "bugs":       { "url": "https://github.com/<你>/dsh-app-native/issues" }

git remote add origin git@github.com:<你>/dsh-app-native.git
git branch -M main
git push -u origin main
```

本地仓库已经 `git init` 并提交好了（1 个提交，9 个文件）。

## 2. 登录 npm 并发布

```sh
npm login            # 交互式授权（浏览器或 OTP）
npm publish          # package.json 的 publishConfig 已指向 https://registry.npmjs.org/
```

发布后自检：

```sh
npm view dsh-app-native version
dsh plugin --profile web add dsh-app-native     # 装到真实 profile
# 重启 profile → 新会话的预设选择器里应出现「APP原生开发」
```

> 注意 `npm publish` 会在**公网发布**，任何人都能安装。若要撤回：`npm unpublish dsh-app-native@0.1.0`（72 小时内）。

## 3. 提交收录 PR —— 这一步才让它出现在「插件市场」里

市场的目录数据来自仓库 **[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)** 的 `data/plugins/`，**一个插件一个 YAML 文件**；两个 README 由脚本生成，**不要手工编辑**。

1. Fork 该仓库
2. 把本目录的 `market/awesome-dsh-plugin-entry.yml` 复制过去，命名为 **`data/plugins/<owner>__dsh-app-native.yml`**（`<owner>` 必须与仓库所属者完全一致）
3. 把文件里的 `<OWNER>` 换成你的 GitHub 用户名
4. 提 PR

条目格式（官方 `contributing.md` 原文要求）：

```yaml
url: https://github.com/<owner>/dsh-app-native
name: <owner>/dsh-app-native
category: workflow
description:
  en: '...'
  zh: ...
```

- `category` 取值必须是这组之一：`agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun`
- **只有 `description.en` 是必填的**；缺中文由维护者补
- 描述里出现 `": "`（冒号+空格）**必须加引号**，否则 YAML 会解析失败（中文全角冒号「：」没这个问题）
- 合并后由 CI 重新生成 README 与 `plugins.json`，市场客户端（`dshmarket`）下次打开即能看到

## 4. 发布后建议做的

- 在仓库里打 tag 与 Release（`v0.1.0`），方便别人固定版本：`git tag v0.1.0 && git push --tags`
- 后续升版本：改 `package.json` 的 `version` → `npm publish` → 市场侧版本/下载量由 CI 自动刷新
- 想验证收录是否生效：`curl -s https://awesome-dsh-plugin.com/plugins.json | grep dsh-app-native`

---

## 附：为什么包名与目录名都用 `app-native`

预设 id 就是它在 `$DSH_HOME/.agent-presets/` 下的目录名（`app-native`），也是本机正在用的那个；包名 `dsh-app-native` 与之对应。安装器**已存在就不覆盖**，所以插件装到已经有该预设的机器上是安全的（你的本地改动会保留）。
