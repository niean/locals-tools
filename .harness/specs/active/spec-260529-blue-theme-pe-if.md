# PE / IF 蓝色主题统一设计说明

## 目标
将 PhotoEditor（PE）与 iframer（IF）统一到同一套蓝色品牌语义下，同时保持两者当前布局、信息层级与工具使用方式不变。

## 范围
- PhotoEditor：统一品牌蓝与相关 hover / 边框 / 表面中性色
- iframer：将标题栏、分隔条交互色、favicon 调整为蓝色系
- 不调整功能逻辑
- 不重做布局
- 不新增设计系统抽象

## 设计结论
采用“品牌蓝点缀版”：只统一主品牌蓝、激活态、标题栏与 favicon，保留工作区主体为中性浅色，以确保工具内容仍是视觉主角。

## 视觉原则
- 主品牌蓝：使用与根首页一致的亮蓝作为识别锚点
- 中性工作区：编辑区、预览区保持浅色中性，避免影响内容判断
- 轻量统一：只改关键视觉锚点，不做整页染蓝
- 工具优先：品牌感服务于识别，不抢占操作界面注意力

## 具体方案
### PhotoEditor
1. 保留现有布局与浅色工作台
2. 将 `--color-primary` / `--color-primary-hover` 对齐到亮蓝品牌值
3. 将 surface / border / canvas 背景灰阶轻微校准为偏冷中性色，增强与蓝主色的一致性
4. favicon 保持蓝色工具箱风格，不再额外改造结构

### iframer
1. 将页面 favicon 改为蓝色工具风格
2. 将标题栏从深灰改为品牌蓝
3. 将页面背景、分隔条、悬浮态、错误提示背景微调到更协调的冷色中性/浅蓝辅助色
4. 保持编辑器、预览器布局与交互完全不变

## 文件范围
- 修改 `photo-editor/css/settings/_variables.css`
- 修改 `iframer/index.html`
- 可复用根 `favicon.svg` 作为 iframer favicon 视觉来源，也可内联同风格 SVG

## 验收标准
- PE 与 IF 均呈现明确蓝色品牌识别
- PE 与 IF 的布局、功能、交互不发生变化
- `http://localhost:8888/photo-editor/` 与 `http://localhost:8888/iframer/` 都能看到蓝色系 favicon / 主题锚点
- 页面仍保持工具类产品的清爽可读性
