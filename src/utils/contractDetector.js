/**
 * 多链合约地址检测工具
 * 支持 BSC 和 Solana 链
 */

// BSC合约地址正则表达式（0x开头，42位十六进制）
const BSC_ADDRESS_REGEX = /\b(0x[a-fA-F0-9]{40})\b/g;

// Solana合约地址正则表达式（base58编码，32-44个字符）
// Solana地址只包含 base58 字符集：1-9, A-Z, a-z，排除 0, O, I, l
const SOLANA_ADDRESS_REGEX = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;

/**
 * 从文本中提取所有合约地址（BSC 和 Solana）
 * @param {string} text - 待检测的文本
 * @returns {Array<{address: string, chain: string}>} 提取到的合约地址数组
 */
export function extractContractAddresses(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const results = [];
  const foundAddresses = new Set();

  // 提取 BSC 地址
  const bscMatches = text.match(BSC_ADDRESS_REGEX);
  if (bscMatches) {
    bscMatches.forEach(address => {
      if (!foundAddresses.has(address.toLowerCase())) {
        foundAddresses.add(address.toLowerCase());
        results.push({
          address: address,
          chain: 'bsc'
        });
      }
    });
  }

  // 提取 Solana 地址
  const solanaMatches = text.match(SOLANA_ADDRESS_REGEX);
  if (solanaMatches) {
    solanaMatches.forEach(address => {
      // 排除已识别为BSC地址的
      if (!foundAddresses.has(address.toLowerCase())) {
        // 进一步验证是否为有效的 Solana 地址
        if (isValidSolanaAddress(address)) {
          foundAddresses.add(address.toLowerCase());
          results.push({
            address: address,
            chain: 'solana'
          });
        }
      }
    });
  }

  return results;
}

/**
 * 检查文本中是否包含合约地址
 * @param {string} text - 待检测的文本
 * @returns {boolean} 是否包含合约地址
 */
export function hasContractAddress(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return BSC_ADDRESS_REGEX.test(text) || SOLANA_ADDRESS_REGEX.test(text);
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

/**
 * 验证是否为有效的Solana地址格式
 * @param {string} address - 地址
 * @returns {boolean} 是否有效
 */
export function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Solana地址长度通常是32-44个字符
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // 只包含base58字符（排除0, O, I, l）
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
    return false;
  }

  // 排除一些常见的误判（纯数字、过短的字符串等）
  // Solana地址通常长度在43-44字符左右
  if (address.length < 40) {
    return false;
  }

  return true;
}

/**
 * 检测地址类型
 * @param {string} address - 地址
 * @returns {string|null} 'bsc', 'solana' 或 null
 */
export function detectChainType(address) {
  if (isValidBscAddress(address)) {
    return 'bsc';
  }
  if (isValidSolanaAddress(address)) {
    return 'solana';
  }
  return null;
}
