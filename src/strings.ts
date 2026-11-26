import { getLanguage } from 'obsidian';

interface Texts {
  saveFailed: string;
  loadFailed: string;
  invalidData: string;
  refreshCommand: string;
  edgeHint: string;
  widthHint: string;
  tableWidth: string;
  scaleTable: string;
  status: (active: number, saved: number) => string;
}

const en: Texts = {
  saveFailed: 'Could not save table layout. Check the developer console for details.',
  loadFailed: 'Could not read saved table layouts. Back up data.json and repair or rename it, then reload the plugin.',
  invalidData: 'Saved table layouts have an unsupported format. Data was preserved; reload a compatible plugin version.',
  refreshCommand: 'Refresh table scaling',
  edgeHint: 'Drag the outer edge to scale; double-click to reset to 100%',
  widthHint: 'Drag to change table width without changing text size; double-click to restore width',
  tableWidth: 'Table width',
  scaleTable: 'Scale table',
  status: (active, saved) => `${active} tables connected; ${saved} saved table layouts.`,
};

const zh: Texts = {
  saveFailed: '表格布局保存失败，请查看开发者控制台。',
  loadFailed: '无法读取表格布局记录。请备份并修复或重命名 data.json，再重新加载插件。',
  invalidData: '表格布局记录格式不受支持，原数据已保留。请使用兼容版本的插件。',
  refreshCommand: '刷新表格缩放',
  edgeHint: '拖动表格外边缘缩放；双击恢复 100%',
  widthHint: '左右拖动调整表格宽度，文字大小不变；双击恢复宽度',
  tableWidth: '表格宽度',
  scaleTable: '缩放表格',
  status: (active, saved) => `当前关联 ${active} 张表格，已保存 ${saved} 项表格设置。`,
};

export function getTexts(): Texts { return getLanguage().startsWith('zh') ? zh : en; }
