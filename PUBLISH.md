# 发布清单 — dsh-app-native

Owner: **LoserForLoser**(447231214@qq.com)。

## 状态

| 步骤 | 状态 |
|---|---|
| npm 包名 | **可用** — `dsh-app-native` registry 返回 404 |
| 包内容 | **就绪** — `npm pack` = 8 个文件(见下) |
| `dsh.bundle` manifest | **就绪** — `{"bundle":{"patch":"./cordis.patch.yml"}}`,仓库根有 `cordis.patch.yml` |
| 测试 | **15/15 通过** — `npm test`(见 §测试);已随仓库提交,不再是不能复核的声明 |
| GitHub 仓库 | **待你建** — `LoserForLoser/dsh-app-native` 目前 404;仓库创建需要网页或 token,SSH 无法创建 |
| 市场条目 | **就绪** — `market/LoserForLoser__dsh-app-native.yml`(文件名符合 `data/plugins/<owner>__<repo>.yml` 约定) |
| npm 发布 | **待凭据** — 本机 `npm whoami` → `ENEEDAUTH`,npm 账号与 GitHub 独立 |
| 仓库 topic | **待你点一下** — 收录要求仓库带 `dsh-plugin` topic(About 面板,Topic 无法通过 SSH 设置) |

## 需要人工完成的动作

1. **建空仓库** https://github.com/new → 名字 `dsh-app-native`,Public,不要勾 README / .gitignore / license。
2. **加 topic**:仓库 About 面板 → Topics → `dsh-plugin`(可顺手补一句描述)。
3. **npm 凭据**:注册 https://www.npmjs.com/signup(同邮箱),然后在
   https://www.npmjs.com/settings/~/tokens 新建 **Granular Access Token**(Packages: read+write,
   勾选 *Bypass 2FA*,有效期按需)。把 token 设为环境变量即可非交互发布:

   ```bash
   cd /Users/songzhaoyang/Desktop/JLXY/dsh-app-native
   NPM_TOKEN=... npm publish --registry https://registry.npmjs.org/ \
     --//registry.npmjs.org/:_authToken=$NPM_TOKEN
   ```

   发布后包名 `dsh-app-native` 全局可用,`dsh plugin add dsh-app-native` 即按名安装。
4. **市场 PR**:仓库满 1 天后(CI 的 `MIN_AGE_DAYS = 1`)按 §市场条目 提 PR。

## 市场条目

`category` 选 **`identity`** 而非 `workflow`:市场数据里这一类的既有条目正是"agent 身份/persona/预设"
(如 persona runtime、强制回复语言),而本仓库交付的正是一个 agent 预设(persona + 组合),
按实际语义归类比按"开发工具"归类更贴合惯例。

提 PR:

```bash
git clone --depth 1 git@github.com:LoserForLoser/awesome-dsh-plugin.git
cd awesome-dsh-plugin
git remote add upstream https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git
git fetch --depth 1 upstream main && git checkout -b add-dsh-app-native FETCH_HEAD
cp /Users/songzhaoyang/Desktop/JLXY/dsh-app-native/market/LoserForLoser__dsh-app-native.yml \
   data/plugins/LoserForLoser__dsh-app-native.yml
git add data/plugins/LoserForLoser__dsh-app-native.yml
git commit -m "Add dsh-app-native"
git push origin add-dsh-app-native
```

规则要点(摘自市场 `contributing.md`):一个插件一个文件、路径为 `data/plugins/<owner>__<repo>.yml`;
只有 `description.en` 必填;描述含 `": "` 必须加引号(本条目已用单引号包裹);不要手工编辑生成的 README;
仓库需满 1 天且带 `dsh-plugin` topic;仓库需有真实可用代码。

## 测试

```bash
npm test        # 15 passed, 0 failed
```

覆盖:模块导出面、`resolveDshHome` 对 `$DSH_HOME` 与 `~/.dsh` 的解析、预设包完整性
(`preset.yml` 的 name/description/order)、**persona 是否仍覆盖 iOS/Android/HarmonyOS 全部原生语言
标记**(防止 persona 被截断)、全新安装逐字节一致、幂等且保留本地改动、部分拷贝可恢复、
不可写 home 只告警不抛错、`apply()` 默认安装 / `config.presetId` 改位 / `installPreset:false` 跳过 /
无 logger 时走 console 兜底。

测试桩两处踩坑已修:harness logger 是 printf 风格(`%s`),以及 `apply()` 的安装是
fire-and-forget,**必须轮询等待真实 fs I/O**(固定次数的微任务不足以覆盖线程池 I/O)。

## 包内容(`npm pack` 8 个文件)

```
package.json
cordis.patch.yml
lib/index.js
preset/app-native/agent.cordis.yml
preset/app-native/preset.yml
README.md
README.zh.md
LICENSE
```

`test/` 只在仓库里,不进 npm 包(`files` 白名单未包含它)。
