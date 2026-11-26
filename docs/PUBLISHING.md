# 发布到 Obsidian 社区

此工程已整理为可检查的发布源码。创建 GitHub 仓库和正式发布仍由维护者操作。

## 1. 本地检查

在工程根目录运行：

```sh
npm ci
npm run package
```

检查通过后，安装文件位于 `dist/1.2.1/`：`main.js`、`manifest.json`、`styles.css`；`SHA256SUMS.txt` 留作本地校验。发布前完成[手动验收](../tests/manual.md)，特别是单独拉宽、等比例缩放、编辑和重启恢复。

`manifest.json`、`package.json` 和 `versions.json` 的版本必须一致。当前作者为 **Sevelyn**；GitHub 用户名确定后，再按需补充仓库链接和作者主页，不应使用猜测的链接。

## 2. 创建自己的 GitHub 仓库

将本工程作为独立项目建立 Git 仓库并上传。不要上传 `node_modules`、`main.js`、`data.json`、`.test-build`、`.local-backups` 或 `dist`；忽略规则已经包含这些路径。

源码仓库根目录应保留 `manifest.json`、`README.md`、`LICENSE`。发布的二进制文件由 GitHub Release 单独提供。

提交前在社区目录确认 `table-scale` 这个 ID 是否可用。最终唯一性由社区提交系统校验；尚未提交意味着不能保证该 ID 已被保留。若有冲突，应在首次公开发布前确定新 ID，并为本地用户保留升级数据的迁移方案。

## 3. 创建 GitHub Release

版本标签必须与 `manifest.json` 完全一致，例如 `1.2.1`，不要加 `v` 前缀。

本工程的 `.github/workflows/release.yml` 会在推送版本标签时运行完整检查，为三个安装文件生成 GitHub 构建来源证明，并创建一个 **草稿 Release**。检查附件、证明步骤和版本说明后，再由维护者发布草稿。

Release 的安装附件只包含 `main.js`、`manifest.json`、`styles.css`。本地校验文件不作为 Release 附件，避免社区检查提示额外的非安装文件。

来源证明通过 GitHub Attestations 服务保存，而非额外上传为安装附件。公开仓库可以使用此功能；工作流授予构建任务所需的 `id-token: write` 和 `attestations: write` 权限。说明见 [GitHub 构建来源证明文档](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)。

## 4. 提交社区目录

当前官方流程：

1. 使用 Obsidian 账号登录 [community.obsidian.md](https://community.obsidian.md)。
2. 在个人资料中关联自己的 GitHub 账号。
3. 进入 **Plugins → New plugin**，填写仓库地址和维护者信息。
4. 确认开发者政策并提交，根据自动审核结果修正问题。
5. 对需要更正的版本修改源码并增加版本号、创建新的 Release，再按目录指引发布。

官方说明：[提交插件](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)、[账号关联和提交入口](https://docs.obsidian.md/community-directory/set-up-and-claim)、[插件提交要求](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)。

## 5. 后续版本

更新源码和更新日志后，可用：

```sh
npm version patch --no-git-tag-version
npm run package
```

版本脚本会同步 `manifest.json` 和 `versions.json`，npm 同步 `package.json` 与锁文件；随后自行提交源码并创建对应标签。不要将模板旧教程中的 PR 提交流程当成当前社区入口。
