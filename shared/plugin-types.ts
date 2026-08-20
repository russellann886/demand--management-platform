// ---- plugin:demand_merge_analyzer ----
// ============================================================
// 插件 demand_merge_analyzer (需求整合分析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DemandMergeAnalyzerInput {
  /** 用户传入的完整分析提示词，包含所有现有需求的JSON列表 */
  prompt: string;
}

/**
 * capabilityClient.load('demand_merge_analyzer').call<DemandMergeAnalyzerOutput>('textGenerate', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { content, response } = result;
 */
export interface DemandMergeAnalyzerOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:demand_merge_analyzer ----

// ---- plugin:demand_submit_feishu_notify_1 ----
// ============================================================
// 插件 demand_submit_feishu_notify_1 (新需求提交飞书通知) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DemandSubmitFeishuNotifyOneInput {
  /** 底部跳转按钮的URL，点击进入应用需求整合页 */
  linkUrl: string;
  /** 接收人用户ID列表 */
  receiverUserList: string[];
  /** 消息卡片标题 */
  title: string;
  /** markdown格式正文，包含新需求摘要与AI合并建议 */
  content: string;
}

/**
 * capabilityClient.load('demand_submit_feishu_notify_1').call<DemandSubmitFeishuNotifyOneOutput>('send_feishu_message', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 */
export interface DemandSubmitFeishuNotifyOneOutput {
  /** [object Object] */
  success: boolean;
}
// ---- end:demand_submit_feishu_notify_1 ----

// ---- plugin:demand_follow_feishu_notify_1 ----
// ============================================================
// 插件 demand_follow_feishu_notify_1 (需求跟进飞书通知) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DemandFollowFeishuNotifyOneInput {
  /** markdown 正文内容 */
  content: string;
  /** 底部跳转按钮URL（「我的需求」页面地址） */
  linkUrl: string;
  /** 接收人用户ID列表 */
  receiverUserList: string[];
  /** 卡片标题 */
  title: string;
}

/**
 * capabilityClient.load('demand_follow_feishu_notify_1').call<DemandFollowFeishuNotifyOneOutput>('send_feishu_message', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 */
export interface DemandFollowFeishuNotifyOneOutput {
  /** [object Object] */
  success: boolean;
}
// ---- end:demand_follow_feishu_notify_1 ----