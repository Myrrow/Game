# Game
Just a little game.

## 夜市游戏摊

一个网页小游戏合集。用浏览器打开 `index.html`，先选一个摊位（游戏）再开始玩，不需要安装任何东西。

| 游戏 | 玩法 | 操作 |
| --- | --- | --- |
| 夏夜捕萤 | 60 秒内用玻璃罐接住发光的萤火虫，躲开胡蜂 | 鼠标 / 触屏 / 方向键 |
| 舞龙 | 贪吃蛇：舞龙吃绣球，越长越快 | 方向键 / WASD / 滑动 |
| 节气翻牌 | 二十四节气记忆配对，三档难度 | 点击 / 键盘 |
| 灯笼 2048 | 合并相同的灯笼，冲到 2048 | 方向键 / WASD / 滑动 |

最高分保存在浏览器本地（localStorage）。

## 目录结构

```
index.html          大厅：列出所有游戏，负责打开 / 关闭游戏
games/firefly.js    夏夜捕萤
games/dragon.js     舞龙
games/jieqi.js      节气翻牌
games/lantern2048.js 灯笼 2048
```

## 添加新游戏

每个游戏是 `games/` 下的一个独立脚本，用普通 `<script>` 标签加载，把自己登记到 `window.MiniGames`：

```js
(() => {
  (window.MiniGames = window.MiniGames || []).push({
    id: 'mygame',            // 唯一 id，也用作 index.html#mygame 的直达链接
    title: '游戏名',
    tagline: '一句话介绍',
    controls: '方向键 · 滑动',
    accent: '#ffc94a',       // 大厅里灯笼的颜色
    bestLabel: '分',
    lowerIsBetter: false,    // 步数、用时之类越少越好时设为 true
    mount(root, api) {
      // 所有 DOM 都放进 root；样式用 <style> 放在 root 里，并以 .mg-mygame 为前缀
      // api.getBest() 读最高分；api.submitScore(n) 返回 { best, isNew }；api.exit() 回到大厅
      return function cleanup() {
        // 取消 requestAnimationFrame、移除 window/document 上的监听、关闭 AudioContext
      };
    },
  });
})();
```

然后在 `index.html` 里加一行 `<script src="games/mygame.js"></script>`。

规则：

- 不要写 `body`、`:root` 之类的全局样式，也不要定义全局变量。
- `cleanup()` 之后游戏不能有任何东西还在运行。同一个游戏可能被反复打开、关闭。
- 字体用大厅提供的 CSS 变量：`var(--display)`（标题）和 `var(--body)`（正文）。
