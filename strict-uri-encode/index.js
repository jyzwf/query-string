'use strict';
module.exports = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`)

/**
 * encodeURIComponent()是对统一资源标识符（URI）的组成部分进行编码的方法。它使用一到四个转义序列来表示字符串中的每个字符的UTF-8编码
 * encodeURIComponent 转义除了字母、数字、(、)、.、!、~、*、'、-和_之外的所有字符。
 * 为了更严格的遵循 RFC 3986（它保留 !, ', (, ), 和 *），即使这些字符并没有正式划定 URI 的用途，下面这种方式是比较安全的：
 * 
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 */

