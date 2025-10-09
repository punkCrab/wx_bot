/**
 * BSC合约地址检测工具
 */

// BSC合约地址正则表达式（0x开头，42位十六进制）
const BSC_ADDRESS_REGEX = /\b(0x[a-fA-F0-9]{40})\b/g;

/**
 * 从文本中提取所有BSC合约地址
 * @param {string} text - 待检测的文本
 * @returns {string[]} 提取到的合约地址数组
 */
export function extractContractAddresses(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matches = text.match(BSC_ADDRESS_REGEX);

  if (!matches) {
    return [];
  }

  // 去重
  return [...new Set(matches)];
}

/**
 * 检查文本中是否包含BSC合约地址
 * @param {string} text - 待检测的文本
 * @returns {boolean} 是否包含合约地址
 */
export function hasContractAddress(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return BSC_ADDRESS_REGEX.test(text);
}

/**
 * 验证是否为有效的BSC地址格式
 * @param {string} address - 地址
 * @returns {boolean} 是否有效
 */
export function isValidBscAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
