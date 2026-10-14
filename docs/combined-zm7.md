# 合并版 zm7：最小配置优化与证据边界

审查日：2026-10-14。基线：`004ab27`（zm6）；只发布到 `update/upstream-20261014`，不修改 main 或独立模块。

## 官方契约：不是响应脚本串行

以 curl 直接获取 Surge 官方手册核查，不能照搬其他代理规则：

- [HTTP Response Script](https://manual.nssurge.com/scripting/http-response.html)：**“At most one script runs per response: the first enabled http-response script in the profile whose pattern matches wins.”** 一个响应最多运行首个匹配脚本。
- [HTTP Request Script](https://manual.nssurge.com/scripting/http-request.html)：请求同样只运行首个匹配脚本。
- [Scripting Overview](https://manual.nssurge.com/scripting/overview.html)：默认 body limit 为 iOS 1 MB / Mac 10 MB；JSC 初始化低延迟但没有完整 Web API，WebView 提供 Web API。不能仅凭 Node mock 就把 WebView 改为 JSC。
- 响应 `$done`：未返回成员保持原值，`headers` **替换全部**响应头，`body` 为 String/Uint8Array 且必须 requires-body；`$done()` / `$done({})` 原样交付；不是调用下一个匹配脚本。
- 超出 max-size 会跳过脚本并 passthrough，`-1` 不限制缓冲。降低限制可能直接绕过去广告/字幕，不是无损内存优化。

### 原 zm6 的真实路径

| 响应 | 原首匹配脚本 | 原后续被遮蔽脚本 |
| --- | --- | --- |
| HTTPS youtubei.googleapis.com player | Maasea response | DualSubs YouTube response |
| HTTPS youtubei.googleapis.com get_watch | Maasea response | DualSubs YouTube response |
| HTTPS youtubei.googleapis.com browse?subtype=Translate | Maasea response | Universal Translate response |

这不是“一份响应被两次解码”。对于 HTTPS player，请求阶段仍由 DualSubs 修改请求，然后响应阶段由 Maasea 处理：这是两个不同 body 的各一次解码；不是两套响应脚本链式接力。对于 HTTPS get_watch，没有对应 DualSubs 请求规则，响应只由 Maasea 处理。保留源字幕的 timedtext 请求/Translate 响应可以独立工作，解释了用户确认 zm6 简中正常，但不能证明 DualSubs 的 HTTPS 字幕轨道注入、protobuf 歌词路径可用。

## 实施

1. 仅合并版版本升级为 `2026.10.14-zm7`，保留“实验”。
2. 被 Maasea 覆盖的 DualSubs player/get_watch/protobuf lyrics 响应规则收窄为 HTTP；保留原有 HTTP 功能，不删除 Maasea 匹配，不交换优先级。HTTPS 对这些路径从两个匹配候选变为一个，首匹配执行结果不变。
3. 四条字幕/歌词响应规则限定 subtype 为真实查询参数及完整值；`xsubtype=Translate`、`x=subtype=Translate`、`subtype=TranslateExtra` 等不再误触发完整 bundle 解析/网络翻译。合法参数位置与顺序不变。
4. README、分析及模块描述明确首匹配机制及原有功能缺口，移除“先去广告再注入字幕”暗示。
5. 新增实际 vendor bundle mock 与路由回归，显式断言单次 `$done`、Uint8Array、headers、未知 protobuf 字段、Maasea 删除广告及注入 PiP/后台、JSON 字幕与简中 Translate 异步回调。

## 不实施及原因

- **不新增单入口串联器**：官方 `$done` 完成语义明确，但原 bundle 混有同步异常/异步 finally、请求级状态、平台检测、持久化缓存与网络回调。尚无真实客户端 player/get_watch/browse 捕获覆盖全部分支；把两套 bundle 简单拼接、eval 或覆盖全局 `$done` 不能算充分验证。单入口还会在原来只有一次响应解码的路径增加另一套解码，并非当然更快。
- **不改 WebView/JSC**：Maasea response 及 DualSubs 依赖 TextEncoder/TextDecoder 等 API，未经 Surge JSC 真实可用性验证，不以 Node 实现代替。
- **不改 body limit**：保留 Maasea `max-size=-1` 及其他原默认，避免大 body 被跳过。代价与内存风险仍存在。
- **不删除请求处理**：player 用于自动字幕默认开启，browse 用于歌词 subtype；config/log_event/initplayback 用于播放密钥及加密流。不能因某个 mock 无数据就认定无用。
- **不清缓存/不减缓存容量**：保留广告学习、播放密钥及字幕缓存；不要求用户清 BoxJS/tlang。
- **不改日志架构**：保持 DualSubs LogLevel=ERROR、Maasea Debug=false 参数；上游仍可能有少量启动/异常日志。没有为了安静而吞异常或改 vendor。
- **不改参数与能力**：保留 AUTO 源语言、ForceSimplifiedChinese、ZH-HANS 目标、Translate、PersistentStore、captionLang=off、广告/PiP/后台等；不无谓升级两独立版。

vendor 六文件逐字节未变；现有 SHA 表、zm6 唯一锚点/SHA 保护及 sync-vendor 暂存验证流程保持有效。无需更新 vendor SHA 或新增补丁保护规格。

## 测试与性能结论

环境：Minis/iSH Alpine aarch64，Node `v22.15.1`；VM 模拟 Surge globals，不是 Surge WebView、真实 YouTube 流量或在线 Google API 实测。

```bash
node scripts/test-combined-surge-mock.js
python3 scripts/test-simplified-chinese.py
node scripts/test-request-surge-mock.js
python3 scripts/patch-dualsubs.py
bash -n scripts/sync-vendor.sh
node --check scripts/test-combined-surge-mock.js
git diff --check
```

结果：

- 合并路由 829 用例通过，合法路径 zm6/zm7 首匹配相同；覆盖 HTTP/HTTPS、5 域名、10 API endpoint、查询参数顺序及 timedtext。
- 5 个相似 subtype 误命中样本被排除；这是减少无关 bundle 处理的实际匹配修复，不代表实际用户流量命中率。
- 15 个实际 vendor 完整 bundle 用例通过：Maasea 9 个 protobuf endpoint、DualSubs player/get_watch protobuf、JSON player、2 个 protobuf 请求、timedtext Translate。player/get_watch 含合成的广告、播放状态及未知 protobuf 字段；断言广告删除、PiP/后台注入、未知字段及 headers 保留。
- Translate 测试使用受控异步 Google 回调，校验请求源 en、目标 zh-CN（ZH-HANS 的 Google 映射），最终双语正文 `Hello\n你好`；没有调用外部翻译服务。
- 现有 288 个语言/URL/cache/source 补丁回归、24 个实际请求 bundle 回归通过。
- 四份 patched vendor 均通过“逆向撤销补丁后核对原始 SHA”验证，六 vendor JS 语法通过。

**性能数字边界：**没有发布耗时、内存或电量提升百分比，也没有声称减少了一次原本存在的响应解码。HTTPS 三路径实际首匹配执行次数前后都是 1；正常 body 的解码次数没有变化。候选规则减少以及相似 subtype 不再误触发可由匹配测试复现；真机时延、内存收益未知。对大响应或密集字幕的性能仍应在 Surge 真机观察。

## 实验标签与用户回归

保留实验标签：清除了 HTTPS 重叠候选并纠正了描述，**但未补齐原被遮蔽的轨道注入/歌词能力**。用户确认 zm6 简中正常是积极证据，不等于所有 YouTube/Surge 版本与全部分支稳定。zm7 不应称稳定合并版。

1. 更新合并模块至 zm7，刷新远程脚本缓存，只启用此模块；不同时开两个独立版/官方 Enhance。
2. 保留已有 BoxJS/tlang，重开 YouTube；测试英文、日文、繁体源字幕，确认源文不变且译文简中、双语显示与原 zm6 一致。
3. 测试普通视频、直播、Shorts；检查广告、PiP、锁屏后台、网络切换。
4. 观察 player/get_watch/config/log_event/initplayback 正常命中，没有 protobuf、超时、body-size 跳过或 Network Extension 重启。
5. 分别记录 JSON player、timedtext 翻译、music.youtube.com JSON 歌词；不要把 HTTPS protobuf browse 不翻译当成 zm7 新回归——原已被遮蔽。
6. PiP 字幕单独记录，不承诺一定显示。异常回退字幕独立 zm6 或播放增强独立 zm5（二选一）。
