'use strict';
import strictUriEncode from './strict-uri-encode'
import objectAssign from 'object-assign'

function encoderForArrayFormat(opts) {  // stringify函数的辅助函数
    switch (opts.arrayFormat) {
        case 'index':
            /**
             * queryString.stringify({foo: [1,2,3]}, {arrayFormat: 'index'});
             * // => foo[0]=1&foo[1]=2&foo[3]=3
             */
            return (key, value, index) => {

                return value === null ? [
                    encode(key, opts),
                    '[',
                    index,
                    ']'
                ].join('') : [
                    encode(key, opts),
                    '[',
                    encode(index, opts),
                    ']=',
                    encode(value, opts)
                ].join('')
            }

        case 'bracket':
            /**
             * queryString.stringify({foo: [1,2,3]}, {arrayFormat: 'bracket'});
             *  => foo[]=1&foo[]=2&foo[]=3
             */
            return (key, value) => {
                return value === null ? encode(key, opts) : [   
                    encode(key, opts),
                    '[]=',
                    encode(value, opts)
                ].join('')
            }

        default:
            /**
             * queryString.stringify({foo: [1,2,3]});
             * // => foo=1&foo=2&foo=3
             */
            return (key, value) => {
                return value === null ? encode(key, opts) : [
                    encode(key, opts),
                    '=',
                    encode(value, opts)
                ].join('')
            }
    }
}

function parserForArrayFormat(opts) {  // parse函数的辅助函数
    let result

    switch (opts.arrayFormat) {
        case 'index':
            /**
             * 索引
             * queryString.parse('foo[0]=1&foo[1]=2&foo[3]=3', {arrayFormat: 'index'});
             * //=> foo: [1,2,3]
             */
            return (key, value, accumulator) => {
                result = /\[(\d*)\]$/.exec(key)     // 判断是否满足key[0]的形式

                key = key.replace(/\[\d*\]$/, '')   // 将形如 key[0] 转化为 key

                if (!result) {  // 如果result不存在，即字符串不是索引类型( foo[0]=1 )，可能是默认类型，形如 'foo=1'
                    accumulator[key] = value
                    return
                }

                // 如果是索引类型且 在 accumulator 中不存在这个 key 
                if (accumulator[key] === 'undefined') {
                    accumulator[key] = {}
                }

                // result[1] 是这个值的索引，即 'foo[1]=9' 中的 1
                accumulator[key][result[1]] = value
            }
        case 'bracket':
            /**
             * 直接类型
             * queryString.parse('foo[]=1&foo[]=2&foo[]=3', {arrayFormat: 'bracket'});
             * //=> foo: [1,2,3]
             */
            return (key, value, accumulator) => {
                result = /(\[\])$/.exec(key)  // 判断是否满足key[]的形式
                key = key.replace(/\[\]$/, '') // 将形如 key[] 转化为 key

                if (!result) { // 如果result不存在，即字符串不是索引类型( foo[]=1 )，可能是默认类型，形如 'foo=1'
                    accumulator[key] = value
                    return
                } else if (accumulator[key] === undefined) {
                    /**
                     * 这部分 if 我认为也可以这么写： accumulator[key] = []    
                     */
                    accumulator[key] = [value]
                    return
                }

                accumulator[key] = [].concat(accumulator[key], value)
            }

        default:
            /**
             * queryString.parse('foo=1&foo=2&foo=3');
             * //=> foo: [1,2,3]
             */
            return (key, value, accumulator) => {
                if (accumulator[key] === undefined) {
                    accumulator[key] = value;
                    return;
                }

                accumulator[key] = [].concat(accumulator[key], value);
            };
    }
}


function encode(value, opts) {
    if (opts.encode) {
        // 严格模式下的 uri 字符串
        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
        return opts.strict ? strictUriEncode(value) : encodeURIComponent(value)
    }

    return value
}

function keysSorter(input) {
    // 排序 key
    if (Array.isArray(input)) {
        return input.sort()
    } else if (typeof input === 'object') {
        // 递归对象的值并返回值
        return keysSorter(Object.keys(input)).sort((a, b) => Number(a) - Number(b)).map(key => input[key])
    }

    return input
}

/** 
 * Extract a query string from a URL that can be passed into .parse().
 * URL中提取查询字符串
 * 'http://foo.bar/?abc=def&hij=klm' => 'abc=def&hij=klm'
 * 'http://foo.bar/?' => ''
 */
exports.extract = str => str.split('?')[1] || ''

// queryString.parse('foo[]=1&foo[]=2&foo[]=3', {arrayFormat: 'bracket'});

exports.parse = (str, opts) => {
    /**
     * str='foo[]=1&foo[]=2&foo[]=3'
     */
    opts = objectAssign({ arrayFormat: 'none' }, opts)
    // 合并配置项
    /**
     * opts={
     *  arrayFormat: 'bracket'
     * }
     */

    let formatter = parserForArrayFormat(opts)  // 根据配置项选择哪种格式的 parse

    /**
     * formatter=(key, value, accumulator) => {
                result = /(\[\])$/.exec(key)
                key = key.replace(/\[\]$/, '')

                if (!result) {
                    accumulator[key] = value
                    return
                } else if (accumulator[key] === undefined) {
                    accumulator[key] = [value]
                    return
                }

                accumulator[key] = [].concat(accumulator[key], value)
            }
     * 
     */

    let ret = Object.create(null) // 创建一个没有原型的对象

    if (typeof str !== 'string') {  // 如果不是字符串，直接返回 {}
        return ret
    }

    str = str.trim().replace(/^(\?|#|&)/, '')  // 如果str ='?foo=bar'之类的，，直接忽视 ?，这主要对于 URL而言

    if (!str) {
        return ret
    }

    /**
     * str.split('&'):  ["foo[]=1", "foo[]=2", "foo[]=3"]
     */
    str.split('&').forEach(param => {   // 使用split 分隔 键值对
        let parts = param.replace(/\+/g, ' ').split('=')
        /**
         * parts=[key,val]
         */
        let key = parts.shift()     // 提取键
        let val = parts.length > 0 ? parts.join('=') : undefined    // 判断是否有值

        val = val === undefined ? null : decodeURIComponent(val)

        formatter(decodeURIComponent(key), val, ret)    // 根据所选的格式 在ret 中加入 key：val
    })

    /**
     * ret={
     *  foo:[1,2,3]
     * }
     */

    return Object.keys(ret).sort().reduce((result, key) => {    // 排序ret 中的key 
        let val = ret[key]
        if (Boolean(val) && typeof val === 'object' && !Array.isArray(val)) { // 如果 val 是对象，就递归得到这个对象每个键所对应的值
            result[key] = keysSorter(val)
        } else {
            result[key] = val
        }
        return result
    }, Object.create(null))
}


exports.stringify = (obj, opts) => {
    let defaults = {    // 默认配置
        encode: true,
        strict: true,
        arrayFormat: 'none'
    }

    opts = objectAssign(defaults, opts)

    let formatter = encoderForArrayFormat(opts)     // 选择格式化类型

    return obj ? Object.keys(obj).sort().map(key => {
        let val = obj[key]

        /**
         * queryString.stringify({foo: undefined});
         * //=> ''
         */
        if (val === undefined) {
            return ''
        }

        /**
         * queryString.stringify({foo: null});
         * //=> 'foo'
         */

        if (val === null) {
            return encode(key, opts)
        }

        if (Array.isArray(val)) {  // val 是数组
            let result = []

            // queryString.stringify({foo: [1,2,3]});
            val.slice().forEach(val2 => {
                if (val2 === undefined) {
                    return
                }

                result.push(formatter(key, val2, result.length))
            })
            // result=['foo=1','foo=2','foo=3']
            return result.join('&')
        }

        return encode(key, opts) + '=' + encode(val, opts)
    }).filter(x => x.length > 0).join('&') : ''
}