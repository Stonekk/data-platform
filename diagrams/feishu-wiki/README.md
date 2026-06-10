# 飞书 Wiki 台本协作流程图

源文件用于同步到 [人体数采台本机制与协作流程](https://xiaopeng.feishu.cn/wiki/GiB4wdK8QikdMMkNwcxcEutlnfb)

## 画板 block-id / token（Feishu，2025-06 同步）

| 图 | block-id | whiteboard token |
|----|----------|------------------|
| 1 泳道图 | doxcnWEwJSQqixz0QQxxSsl5b5e → doxcnCP71o9sKzcmncD8jdqtG7g | QVrVwGvqFhZ8KebkYM9c4NIcnbb → OxydwwbbthUOAZbz8jAcMF1jnOI |
| 2 时序图 | doxcnCAE9Bf7LmgIAJdtSBP1cse → doxcnxP7KIFSjUVaESeT9lsp9Be | IKLQwizjlhHvR0b8RqWckoOinkb → AwTHw0Zn6hhW6Zbrl0JcQuhMnbg |
| 3 流程图 | doxcnlQP5IOIW5xO3rAC2nUGYPZ → doxcn6ZsSUdMST4BDIzWAkTjOUb | T7aMwm8iRhAyFzbPUCOctm5KnOg → RSLLwmyYVh6LAZbfm0UcWPdanLh |
| 4 思维导图 | doxcn5uaLZ41mc15LiyxL3lXuUc → doxcnvNP1of3SvFVKXhR7yiFoff | Gf3Ew8aGMhLx4wbDHOycpMxPngb → CTYTwFu11hgAtkbZxESczSa8n4O |
| Callout | doxcnIRW87vQ3HQNkCWO4KSEiMh → doxcn4QENa8FLZZCYb4f3jdJ4Rc | — |
| 关键数字表 | doxcnEdvqzikRlOtzc9cJIUvYIg → doxcnBPbiHf1odYLExRaQx1a2Lf | — |

## 同步命令

```bash
cd embodied-data-platform
DOC="https://xiaopeng.feishu.cn/wiki/GiB4wdK8QikdMMkNwcxcEutlnfb"
lark-cli docs +update --api-version v2 --doc "$DOC" --command block_replace \
  --block-id "<block-id>" --content @./diagrams/feishu-wiki/wb1.xml --as user
```

## 机制要点（v3）

- 台本在采集员收到任务前预生成（含原子动作库 A–I 覆盖）
- 贵重道具带审批标签，配置台本前须完成轻量审批门禁
- 运营确认绑定后进入调度；领取后采集员人工确认道具
- 异常：运营现场修改台本并放行 → 采集员直接继续，**不回确认环节**
- VLM 拍照识道具为后续迭代，非主链路卡点
