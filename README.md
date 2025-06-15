# EchoNote: 一款 AI 智能语音备忘录

**2025年春《用户交互技术》期末课程项目**   

**Instructor: Dr. Shuang LIANG**



## 项目简介

一款AI智能语音备忘录，融合语音识别、AI对话助手与笔记管理于一体，实现语音快速记录、智能内容问答，打造全新的数字化思维记录体验。



## 项目展示

本项目功能主要分为4个界面，分别是："备忘录笔记编辑"、"AI助手"、"待办"、"我的" 界面

<p align="center">
  <img src=".\assets\备忘录主界面.png" width="300"/>
  <img src=".\assets\AI 助手界面.png" width="300"/>
</p>

<p align="center">
  <img src=".\assets\待办界面.png" width="300"/>
  <img src=".\assets\个人主界面.png" width="300"/>
</p>



### 笔记编辑页面

本页面是备忘录的基础功能，笔记的撰写和样式改变，以及便捷化语音输入，同时支持

<p align="center">
  <img src=".\assets\基础编辑页面.gif" width="300"/>
</p>



笔记编辑的时候可以自由切换样式：

<p align="center">
  <img src=".\assets\主题样式切换展示.gif" width="300"/>
</p>



主页中已经添加的笔记可以被置顶、删除

<p align="center">
  <img src=".\assets\删除_置顶功能.gif" width="300"/>
</p>



**AI助手**同步跟随笔记内容，在编写笔记的时候，如果遇到问题或者需要 AI 助手帮助，可以随时询问AI助手，帮助用户补全笔记或者答疑解惑!

<p align="center">
  <img src=".\assets\笔记编辑+AI.gif" width="300"/>
</p>

用户也可以随时根据关键字来**搜索**笔记内容

<p align="center">
  <img src=".\assets\搜索界面.gif" width="300"/>
</p>



### 待办界面

用户可以随时在本界面添加任务，并勾选已经完成的任务，完成的任务可以在“已完成”界面中展示

<p align="center">
  <img src=".\assets\待办界面展示.gif" width="300"/>
</p>

### AI 助手界面

本项目接入 `Qwen3` 大模型，用户可以在此界面随时向AI提问，系统支持查看以往聊天记录的功能

同时，本项目将 AI 与用户的笔记、待办深度结合，让用户可以随时提问关于笔记的内容，如：

* 总结笔记内容
* 查看今天有哪些待办
* AI 帮助制定今日计划
* 回答笔记相关问题，如：我之前记录的操作系统课程的复习要点有哪些？

* ....

下面给出部分展示：

1. AI 基础问答界面展示、对话历史的查看与删除

<p align="center">
  <img src=".\assets\AI基础问答.gif" width="300"/>
  <img src=".\assets\AI对话历史_删除.gif" width="300"/>
</p>



2. AI 智能整合备忘录内容

<p align="center">
  <img src=".\assets\AI智能查询备忘录.gif" width="300"/>
</p>



3. AI 根据备忘录、待办事项帮助制定当日计划

<p align="center">
  <img src=".\assets\AI个性化制定计划.gif" width="300"/>
</p>





## 项目代码目录

```py
src/
│
├── App.vue                           # 应用主组件
├── main.js                           # 应用入口文件
├── manifest.json                     # 应用配置清单
├── pages.json                        # 页面路由配置
├── shime-uni.d.ts                    # TypeScript 类型声明
├── uni.scss                          # 全局样式文件
│
├── pages/                           # 页面文件夹
│   ├── ai/                          # AI助手模块
│   │   └── ai-assistant.vue         # AI助手页面
│   │
│   ├── notes/                       # 笔记模块
│   │   ├── new-memo.vue             # 笔记编辑页面 
│   │   ├── notes.vue                # 笔记列表页面
│   │   └── search.vue               # 笔记搜索页面
│   │
│   ├── profile/                     # 个人中心模块
│   │   └── profile.vue              
│   │
│   └── todo/                        # 待办事项模块
│       └── todo.vue                
│
├── static/                          # 静态资源
│   ├── AI.png                       
│   ├── EchoNote.png                 
│   ├── notes.png                    
│   ├── profile.jpg                 
│   ├── self.png                     
│   ├── todo.png                     
│   │
│   └── css/                         # 样式主题
│       ├── github.css               # GitHub主题
│       ├── newsprint.css            # 新闻纸主题
│       ├── night.css                # 夜间主题
│       ├── pixyll.css               # Pixyll主题
│       └── whitey.css               # 白色主题
│
└── utils/                           # 工具函数文件夹
    ├── aiCommandProcessor.ts        # AI命令处理
    ├── aiConfig.ts                  # AI配置文件
    ├── aiService.ts                 # AI服务接口
    ├── dataService.ts               # 数据服务接口
    └── fileStorage.ts               # 文件存储工具
```



## 开发记录

> 5.22 

搭建好 Uni-App 环境并实现一个备忘录基本功能（添加文字、简单UI、本地暂存）



> 5.23

优化 UI 设计，提升交互体验：将方角改为圆角、修改背景色



>5.24

减少页面元素：隐藏右侧滚动条，让页面更简洁

增加页面样式：导入 Typora 中的 `.css` 文件并在编辑的时候实时渲染 (功能待定)

增加功能：添加删除/置顶功能



>5.26

增加语音输入UI，继续遵循极简化设计



>6.1 

进行功能测试，设计 AI 接入的方法，以及如何用 AI 增加用户交互体验

思考市面上的备忘录APP在用户交互方面的可以改进的地方

准备接入音乐模块、情绪感知模块



>6.12

优化UI: 颜色统一

去掉冗余设计：主界面原来有两个添加笔记的按钮，去掉一个

优化用户体验：编辑笔记的时候去掉“完成”按钮，改成离开自动保存



>6.13

界面设计：去掉“语音输入”按钮的文字，直接用一个图标表示

尝试添加 AI 助手界面



>6.14

AI 助手界面优化与实现，参照 ChatGPT 安卓端界面，尝试接入`Qwen`大模型

待办界面更新：优化 UI 设计，任务可按照时间分块，同时可查看“已完成任务”



>6.15

实现功能：AI 助手可以随时正常回答用户的问题

AI 助手可以通过接口访问笔记页面、读入笔记内容进行智能内容总结

AI 记忆用户的所有笔记内容、待办内容，用户可随时通过AI查找笔记细节内容

AI 助手通过自定义接口添加待办事项，读入内容并实现相应功能



>6.16-6.18

PPT制作和文档撰写

项目收尾工作





